/**
 * Maps a raw Supabase Auth (GoTrue) error message to a safe, localized i18n
 * key. Backend error text is almost always English and can hint at internal
 * implementation details, so it must never be shown to the user directly —
 * only a small set of known, genuinely useful cases (rate limiting, wrong
 * credentials, unconfirmed email, duplicate signup) get a specific message.
 * Anything unrecognized falls back to a generic, safe message.
 */
export function friendlyAuthErrorKey(message: string | undefined | null): string {
  const m = (message ?? '').toLowerCase()

  if (/rate limit|too many|seconds|try again later/.test(m)) return 'authError.rateLimited'
  if (/invalid login credentials|invalid.*password|invalid email or password/.test(m)) return 'authError.invalidCredentials'
  if (/email not confirmed/.test(m)) return 'authError.emailNotConfirmed'
  if (/user already registered|already been registered|already exists/.test(m)) return 'authError.alreadyRegistered'
  if (/password.*at least|password.*too short|weak password/.test(m)) return 'authError.weakPassword'
  if (/network|fetch failed|failed to fetch/.test(m)) return 'authError.network'

  return 'authError.generic'
}
