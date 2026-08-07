import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { MailCheck } from 'lucide-react'
import {
  useEnabledOAuthProviders, signInWithProvider, sendMagicLink,
  applySessionAndResolveDestination, PROVIDER_LABEL, type OAuthProvider,
} from '@/lib/auth'

/** Enough to catch a typo and enable the button; the server does the real check. */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Brand marks are inlined so the buttons never depend on a third-party host. */
function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === 'google') return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"/>
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z"/>
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5C3 17 2.1 20.4 2.1 24s.9 7 2.4 9.9l7.3-5.7z"/>
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>
    </svg>
  )
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.72-1.35-.14-2.64.79-3.33.79-.69 0-1.75-.77-2.87-.75-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.51zM14.88 5.6c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.22z"/>
    </svg>
  )
}

export default function LoginPage() {
  const [params]      = useSearchParams()
  const initialMode   = params.get('signup') === '1' ? 'signup' : 'login'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'login'|'signup'>(initialMode)
  const [loading, setLoading]   = useState(false)
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null)
  const [magicBusy, setMagicBusy] = useState(false)
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [notice, setNotice]     = useState('')
  const navigate      = useNavigate()

  // An explicit ?next= wins over the default post-signup routing. Without
  // this, someone signing up to claim an organization (?next=/claim/:id)
  // would be bounced into /portal/onboarding and asked to register a second,
  // duplicate org instead of landing back on the claim they came for.
  const explicitNext  = params.get('next')

  const { data: providers = [] } = useEnabledOAuthProviders()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setNotice('')
    try {
      const { data, error: authError } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (authError) throw authError

      // With email confirmation enabled, signUp returns a user but no session.
      // Routing into the portal here would land them on a signed-out screen.
      if (mode === 'signup' && !data.session) {
        setNotice('Check your email to confirm your account, then sign in.')
        setMode('login')
        return
      }

      if (data.user) {
        const dest = await applySessionAndResolveDestination(data.user, explicitNext)
        navigate(dest, { replace: true })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setOauthBusy(provider); setError('')
    const { error: err } = await signInWithProvider(provider, explicitNext ?? undefined)
    // Reached only if the redirect never started — otherwise the page is gone.
    if (err) { setError(err.message); setOauthBusy(null) }
  }

  async function handleMagicLink() {
    setMagicBusy(true); setError(''); setNotice('')
    const { error: err } = await sendMagicLink(email, explicitNext ?? undefined)
    setMagicBusy(false)
    if (err) {
      // Rate limits are worth showing — the user can act on them by waiting.
      // Anything else is reported generically so this can't be used to test
      // which addresses have accounts.
      setError(/rate|limit|too many|seconds/i.test(err.message)
        ? 'Too many requests. Wait a minute and try again.'
        : 'We couldn’t send the link. Check the address and try again.')
      return
    }
    setMagicSentTo(email.trim())
  }

  const emailValid = EMAIL_SHAPE.test(email.trim())

  // ── Link sent ────────────────────────────────────────────────
  if (magicSentTo) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm text-center">
        <MailCheck size={44} className="text-success-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-500 mb-5">
          We sent a sign-in link to <strong className="break-all">{magicSentTo}</strong>.
          Open it on this device and you’ll be signed straight in — no password needed.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          The link works once and expires in about an hour. If it doesn’t arrive,
          check your spam folder.
        </p>
        <button onClick={() => setMagicSentTo(null)} className="btn-secondary w-full">
          Use a different email
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-sm mx-auto mb-3">SR</div>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === 'login' ? 'Provider Sign In' : 'Create Provider Account'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">StreetRise Provider Portal</p>
        </div>

        {providers.length > 0 && (
          <>
            <div className="space-y-2">
              {providers.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleOAuth(p)}
                  disabled={!!oauthBusy || loading}
                  className="btn-secondary w-full flex items-center justify-center gap-2.5"
                >
                  <ProviderIcon provider={p} />
                  {oauthBusy === p ? 'Redirecting…' : `Continue with ${PROVIDER_LABEL[p]}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input
              id="login-email" type="email" className="input" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" required
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="login-password" className="label">Password</label>
              {mode === 'login' && (
                <Link
                  to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="text-xs text-primary-600 font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="login-password" type="password" className="input" value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required minLength={8}
            />
          </div>
          {notice && <p className="text-sm text-center text-primary-700 bg-primary-50 rounded-xl py-2 px-3">{notice}</p>}
          {error && <p className="error-text text-center">{error}</p>}
          <button type="submit" disabled={loading || !!oauthBusy || magicBusy} className="btn-primary w-full">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Passwordless fallback. Uses the email already typed above, so it
            costs one tap rather than a separate form. */}
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={!emailValid || magicBusy || loading || !!oauthBusy}
          title={emailValid ? undefined : 'Enter your email address first'}
          className="btn-secondary w-full mt-2.5 flex items-center justify-center gap-2 disabled:opacity-55"
        >
          <MailCheck size={15} />
          {magicBusy ? 'Sending…' : 'Email me a sign-in link'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          No password needed — we’ll send a link that signs you in.
        </p>

        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}
            className="text-primary-600 font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
