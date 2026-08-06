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
 */

/** The only fields a claim UPDATE is permitted to write. */
const CLAIM_PATCH = {
  claim_status:        'pending_claim',
  role:                'provider',
  verification_status: 'pending',
} as const

export const CLAIMABLE_KEY = ['claimable-providers']
export const MY_CLAIMS_KEY = ['my-claims']

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

export class ClaimError extends Error {
  constructor(message: string, readonly kind: 'already_owns_org' | 'taken' | 'unknown') {
    super(message)
    this.name = 'ClaimError'
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
  userId: string
  /** Account email. Must equal the JWT's email or RLS rejects the insert. */
  email: string
  /** Where the claimant wants to be reached. Free text, required. */
  contactEmail: string
  note: string
}): Promise<{ claimId: string }> {
  const { data: claim, error: claimErr } = await db.provider_claims()
    .insert({
      provider_id:   opts.providerId,
      user_id:       opts.userId,
      claim_email:   opts.email,
      contact_email: opts.contactEmail.trim(),
      claim_note:    opts.note.trim() || null,
    })
    .select('id')
    .single()

  if (claimErr) {
    if (claimErr.code === '23505') {
      throw new ClaimError('You have already submitted a claim for this organization. It is waiting on review.', 'taken')
    }
    throw new ClaimError(claimErr.message, 'unknown')
  }

  const { error: provErr, count } = await db.providers()
    .update({ user_id: opts.userId, ...CLAIM_PATCH }, { count: 'exact' })
    .eq('id', opts.providerId)
    .eq('claim_status', 'unclaimed')

  if (provErr || !count) {
    // Roll back the evidence row so the org stays cleanly claimable.
    await db.provider_claims().delete().eq('id', claim.id)

    // providers.user_id is UNIQUE, so one account can only ever hold one
    // organization. This is the error a user with an existing org hits.
    if (provErr?.code === '23505') {
      throw new ClaimError(
        'This account is already linked to an organization. Claims need their own account — sign out and register a new one with your work email.',
        'already_owns_org',
      )
    }
    if (provErr) throw new ClaimError(provErr.message, 'unknown')

    // No error but nothing updated: the `claim_status = 'unclaimed'` guard on
    // the update matched no row, so someone claimed it in the meantime.
    throw new ClaimError('Someone else claimed this organization first. Refresh to see its current status.', 'taken')
  }

  return { claimId: claim.id }
}

/** Rejects obvious junk without pretending to validate deliverability. */
export function isEmailShaped(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

/** The signed-in user's email, read from the session rather than form input. */
export async function currentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

export const CLAIM_STATUS_COPY: Record<ProviderClaimStatus, string> = {
  unclaimed:     'Unclaimed',
  pending_claim: 'Claim under review',
  claimed:       'Claimed',
}
