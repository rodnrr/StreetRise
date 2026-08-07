import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

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
