import { useQuery } from '@tanstack/react-query'
import { db, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { currentIdentity } from '@/lib/claims'

/**
 * Auth helpers shared by the login, password-reset, and OAuth-callback pages.
 */

export type OAuthProvider = 'google' | 'apple'

/** Providers we have UI for, in the order they should be offered. */
const SUPPORTED: OAuthProvider[] = ['google', 'apple']

export const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  apple:  'Apple',
}

/**
 * Which social logins are actually turned on for this Supabase project.
 *
 * Asked at runtime rather than gated behind a build-time env var, so enabling
 * Google or Apple in the Supabase dashboard makes the button appear without a
 * redeploy — and, more importantly, so we never render a button that throws
 * "provider is not enabled" when someone taps it.
 *
 * Fails closed: if the settings endpoint is unreachable or its shape changes,
 * no social buttons render and email/password still works.
 */
async function fetchEnabledProviders(): Promise<OAuthProvider[]> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return []

  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    if (!res.ok) return []
    const json = (await res.json()) as { external?: Record<string, boolean> }
    return SUPPORTED.filter(p => json.external?.[p] === true)
  } catch {
    return []
  }
}

export function useEnabledOAuthProviders() {
  return useQuery<OAuthProvider[]>({
    queryKey: ['auth-providers'],
    queryFn: fetchEnabledProviders,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

/**
 * Hands off to the provider. The browser leaves the app here, so anything
 * after this call only runs if the redirect failed to start.
 *
 * `next` is carried through the round trip in the callback URL rather than in
 * app state, which would not survive leaving the page.
 */
export async function signInWithProvider(provider: OAuthProvider, next?: string) {
  const callback = new URL('/auth/callback', window.location.origin)
  if (next) callback.searchParams.set('next', next)

  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  })
}

/**
 * Emails a one-tap sign-in link.
 *
 * Uses the same `/auth/callback` landing point as social sign-in, so the
 * post-login routing is identical however someone got here.
 *
 * `shouldCreateUser` is left at its default of true. That makes this a signup
 * path as well as a sign-in one, which is intended — but it also matters for
 * privacy: with it disabled, requesting a link for an unregistered address
 * returns a distinct error, which would let anyone test which organizations'
 * staff have accounts here. Same reasoning as the password-reset page.
 */
export async function sendMagicLink(email: string, next?: string) {
  const callback = new URL('/auth/callback', window.location.origin)
  if (next) callback.searchParams.set('next', next)

  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: callback.toString() },
  })
}

/**
 * Loads the signed-in user's provider profile into the auth store and works
 * out where they belong.
 *
 * Shared by password login and the OAuth callback so the two cannot drift —
 * the rules about admins, incomplete onboarding, and an explicit `next` are
 * subtle enough that two copies would eventually disagree.
 */
export async function applySessionAndResolveDestination(
  user: { id: string; email?: string | null },
  explicitNext: string | null,
): Promise<string> {
  const { data: provider } = await supabase
    .from('providers')
    .select('id, role, verification_status')
    .eq('user_id', user.id)
    .maybeSingle()

  useAuthStore.getState().setAuth({
    userId:             user.id,
    userEmail:          user.email ?? '',
    role:               (provider?.role as 'provider' | 'admin' | 'super_admin') ?? 'provider',
    providerId:         provider?.id ?? undefined,
    verificationStatus: (provider?.verification_status as
      'pending' | 'verified' | 'rejected' | 'suspended') ?? null,
  })

  if (provider?.role === 'admin' || provider?.role === 'super_admin') return '/admin/dashboard'
  if (explicitNext) return explicitNext
  // No organization yet — finish signing up rather than landing on an empty
  // dashboard. A claim link always arrives with an explicit next, so this
  // never hijacks someone on their way to claim an existing org.
  if (!provider) return '/portal/onboarding'
  return '/portal/dashboard'
}

/**
 * The signed-in account's `providers.id`, resolved from the Supabase session
 * rather than from `useAuthStore`.
 *
 * `streetrise-auth` is plain localStorage and outlives the session it
 * describes. Writes that take their id from it go out as `anon` once the
 * refresh token is gone, `auth.uid()` comes back NULL, and every RLS policy
 * built on `my_provider_id()` rejects the row — the user sees a raw
 * "new row violates row-level security policy" toast for a problem that is
 * really just an expired session. `ProviderOnboarding` and the claim flow
 * already guard their writes this way; this is the same guard, shared.
 *
 * `getUser()` (inside `currentIdentity`) validates the JWT against the auth
 * server and refreshes it when it can, so a null here means the next write
 * genuinely would be unauthenticated.
 *
 * Returns null when there is no usable session, or when the account has no
 * providers row yet (signed up but never finished onboarding).
 */
export async function currentProviderId(): Promise<string | null> {
  const me = await currentIdentity()
  if (!me) return null

  // The store's userId and providerId are always written together from one
  // query, so when the session still belongs to that user the cached id is
  // good and costs no round trip.
  const cached = useAuthStore.getState()
  if (cached.userId === me.userId && cached.providerId) return cached.providerId

  // Store is empty or describes a different account (hydrated from an older
  // session, or someone signed in as someone else in this browser). Re-read
  // the row and repair the store so the rest of the app stops disagreeing
  // with the session.
  const { data: provider } = await db.providers()
    .select('id, role, verification_status')
    .eq('user_id', me.userId)
    .maybeSingle()
  if (!provider) return null

  useAuthStore.getState().setAuth({
    userId:             me.userId,
    userEmail:          me.email,
    role:               (provider.role as 'provider' | 'admin' | 'super_admin') ?? 'provider',
    providerId:         provider.id,
    verificationStatus: provider.verification_status as
      'pending' | 'verified' | 'rejected' | 'suspended',
  })
  return provider.id
}

export const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Sign in again and re-send your message.'

/** Thrown by the messaging mutations when the session is gone. */
export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE)
    this.name = 'SessionExpiredError'
  }
}

/** `currentProviderId()` or a typed failure the chat pages know how to render. */
export async function requireProviderId(): Promise<string> {
  const id = await currentProviderId()
  if (!id) throw new SessionExpiredError()
  return id
}

/**
 * Turns a failed messaging write into copy a person can act on.
 *
 * 42501 is the RLS rejection. By the time a write reaches PostgREST we have
 * already confirmed the session, so a 42501 here means the token expired
 * between the check and the insert — still an expired session, never a
 * permissions problem the user can do anything about.
 */
export function messagingErrorMessage(error: { code?: string }): string {
  if (error.code === '42501') return SESSION_EXPIRED_MESSAGE
  return 'We couldn’t send that message. Please try again in a moment.'
}
