import { useQuery } from '@tanstack/react-query'
import { db, supabase } from '@/lib/supabase'
import type { ClaimableProvider, ProviderClaim, ProviderClaimStatus } from '@/types'

/**
 * Provider claim flow — the client half of migrations 023–027 and 033.
 *
 * The RLS on `providers` is unusually strict here, and the shape of this
 * module follows from it:
 *
 *   providers_claim_submit (025) matches only rows that are currently
 *   `unclaimed`, and its WITH CHECK requires the row AFTER the update to be
 *   user_id = auth.uid(), claim_status = 'pending_claim', role = 'provider',
 *   verification_status = 'pending', with every other column byte-identical
 *   to the seeded values.
 *
 * So `submitClaim` sends exactly those four columns and nothing else. Adding
 * any other field to that update — even setting a column to the value it
 * already holds — risks tripping the policy and failing the claim.
 *
 * Two rules keep that strictness from reaching a user as gibberish:
 *
 *   1. Identity comes from `currentIdentity()`, i.e. from Supabase, never from
 *      `useAuthStore`. The store is persisted localStorage and outlives the
 *      session it describes, so trusting it sends claim writes out as `anon`.
 *   2. Nothing throws a raw driver message. Everything a write can fail with
 *      is mapped to human copy by `claimErrorFor`.
 */

/** The bare identity of an organization an account already owns. */
export interface OwnedOrg {
  id: string
  organization_name: string
  claim_status: ProviderClaimStatus
}

/** The only fields a claim UPDATE is permitted to write. */
const CLAIM_PATCH = {
  claim_status:        'pending_claim',
  role:                'provider',
  verification_status: 'pending',
} as const

export const CLAIMABLE_KEY = ['claimable-providers']
export const MY_CLAIMS_KEY = ['my-claims']
export const MY_ORG_KEY    = ['my-provider-org']

/** Public directory of seeded organizations nobody has claimed yet. */
export function useClaimableProviders() {
  return useQuery<ClaimableProvider[]>({
    queryKey: CLAIMABLE_KEY,
    queryFn: async () => {
      const { data, error } = await db.providers()
        .select('id, organization_name, contact_email, contact_phone, website, bio, claim_status')
        .eq('claim_status', 'unclaimed')
        .order('organization_name')
      if (error) throw error
      return (data ?? []) as ClaimableProvider[]
    },
    staleTime: 1000 * 60,
  })
}

/** A single organization, whatever its claim state (used by /claim/:id). */
export function useClaimableProvider(id: string | undefined) {
  return useQuery<ClaimableProvider | null>({
    queryKey: [...CLAIMABLE_KEY, id],
    queryFn: async () => {
      const { data, error } = await db.providers()
        .select('id, organization_name, contact_email, contact_phone, website, bio, claim_status')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as ClaimableProvider | null
    },
    enabled: !!id,
  })
}

/** Claims filed by the signed-in user. RLS scopes this to their own rows. */
export function useMyClaims(userId: string | null) {
  return useQuery<ProviderClaim[]>({
    queryKey: [...MY_CLAIMS_KEY, userId],
    queryFn: async () => {
      const { data, error } = await db.provider_claims()
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ProviderClaim[]
    },
    enabled: !!userId,
  })
}

/** The organization this account already owns, if it owns one. */
export function useMyProviderOrg(userId: string | null) {
  return useQuery<OwnedOrg | null>({
    queryKey: [...MY_ORG_KEY, userId],
    queryFn: async () => {
      const { data, error } = await db.providers()
        .select('id, organization_name, claim_status')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as OwnedOrg | null
    },
    enabled: !!userId,
  })
}

export type ClaimErrorKind =
  | 'signed_out'        // no live Supabase session — the write went out as anon
  | 'already_owns_org'  // providers.user_id is UNIQUE; this account holds another org
  | 'taken'             // someone else got there first, or this claim already exists
  | 'invalid_email'     // contact_email failed the shape check at the database
  | 'unknown'

export class ClaimError extends Error {
  constructor(message: string, readonly kind: ClaimErrorKind) {
    super(message)
    this.name = 'ClaimError'
  }
}

export const SIGNED_OUT_MESSAGE =
  'Your session has expired. Sign in again and your claim will go straight through.'

/**
 * Turns a PostgREST/Postgres error into copy a person can act on.
 *
 * Every one of these used to reach the user as the raw driver string — the
 * reported bug was a toast reading "new row violates row-level security policy
 * for table provider_claims", which tells a shelter director nothing and
 * (worse) misdescribes the actual problem, which is an expired session.
 *
 * 42501 is deliberately mapped to 'signed_out'. The claim policies grant every
 * authenticated user the right to file a claim as themselves, so the only way
 * to fail the WITH CHECK from this form is for the request to have been made
 * without a valid JWT.
 */
function claimErrorFor(
  err: { code?: string; message?: string } | null,
  on: 'claim' | 'provider',
): ClaimError {
  switch (err?.code) {
    case '42501':
    case 'PGRST301':
    case '401':
      return new ClaimError(SIGNED_OUT_MESSAGE, 'signed_out')

    case '23505':
      // providers.user_id is UNIQUE, so one account can only ever hold one
      // organization. This is the error a user with an existing org hits.
      return on === 'provider'
        ? new ClaimError(
            'This account already manages an organization on StreetRise. Each organization needs its own account — sign out and create one with your work email.',
            'already_owns_org',
          )
        : new ClaimError(
            'You have already submitted a claim for this organization. It is waiting on review.',
            'taken',
          )

    case '23514':
      return new ClaimError(
        'That contact email doesn’t look right. Check it and try again.',
        'invalid_email',
      )

    default:
      return new ClaimError('Something went wrong. Please try again.', 'unknown')
  }
}

/**
 * Files a claim, then flips the provider row to `pending_claim`.
 *
 * Order matters. The evidence row goes in first because it is the harmless
 * half — if the providers UPDATE then fails, we delete it and the org is left
 * exactly as it was. Doing it the other way round would strand an org in
 * `pending_claim` with no evidence and no way back: once claim_status leaves
 * 'unclaimed', providers_claim_submit no longer matches the row and
 * providers_update_self refuses to change claim_status, so the claimant
 * cannot undo it and only an admin could clean it up.
 */
export async function submitClaim(opts: {
  providerId: string
  /** Where the claimant wants to be reached. Free text, required. */
  contactEmail: string
  note: string
}): Promise<{ claimId: string } & ClaimIdentity> {
  // Identity comes from the live session, never from the caller. The persisted
  // auth store outlives the Supabase session, so a page that looks signed in
  // can be one whose JWT is long gone; taking the ids from it would send the
  // write out as `anon` and fail RLS with a raw driver error.
  const me = await currentIdentity()
  if (!me) throw new ClaimError(SIGNED_OUT_MESSAGE, 'signed_out')

  const { data: claim, error: claimErr } = await db.provider_claims()
    .insert({
      provider_id:   opts.providerId,
      user_id:       me.userId,
      claim_email:   me.email,
      contact_email: opts.contactEmail.trim(),
      claim_note:    opts.note.trim() || null,
    })
    .select('id')
    .single()

  if (claimErr) throw claimErrorFor(claimErr, 'claim')

  const { error: provErr, count } = await db.providers()
    .update({ user_id: me.userId, ...CLAIM_PATCH }, { count: 'exact' })
    .eq('id', opts.providerId)
    .eq('claim_status', 'unclaimed')

  if (provErr || !count) {
    // Roll back the evidence row so the org stays cleanly claimable.
    await db.provider_claims().delete().eq('id', claim.id)

    if (provErr) throw claimErrorFor(provErr, 'provider')

    // No error but nothing updated: the `claim_status = 'unclaimed'` guard on
    // the update matched no row, so someone claimed it in the meantime.
    throw new ClaimError('Someone else claimed this organization first. Refresh to see its current status.', 'taken')
  }

  return { claimId: claim.id, ...me }
}

/** Rejects obvious junk without pretending to validate deliverability. */
export function isEmailShaped(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

export interface ClaimIdentity {
  userId: string
  /** The account address. RLS pins claim_email to this, so it is not editable. */
  email:  string
}

/**
 * The signed-in user according to Supabase — not according to `useAuthStore`.
 *
 * `supabase.auth.getUser()` validates the JWT against the auth server (and
 * refreshes it if it can), so a null here means the next database write really
 * would go out unauthenticated. Nothing in the claim flow may be gated on the
 * persisted store alone: `streetrise-auth` is plain localStorage and happily
 * survives the session it describes.
 */
export async function currentIdentity(): Promise<ClaimIdentity | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.email) return null
  return { userId: data.user.id, email: data.user.email }
}

export const CLAIM_STATUS_COPY: Record<ProviderClaimStatus, string> = {
  unclaimed:     'Unclaimed',
  pending_claim: 'Claim under review',
  claimed:       'Claimed',
}
