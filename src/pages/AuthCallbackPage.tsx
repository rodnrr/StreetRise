import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { applySessionAndResolveDestination } from '@/lib/auth'

/**
 * Landing point after a social sign-in round trip.
 *
 * OAuth leaves the app entirely, so the routing decisions the login form makes
 * inline (admin → admin panel, no organization → onboarding, honour an
 * explicit `next`) have to be made again on the way back in. Both paths call
 * the same helper so they cannot diverge.
 */
export default function AuthCallbackPage() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // The provider can refuse or the user can cancel; both come back here
      // with an error in the URL rather than a session.
      const oauthError = params.get('error_description') ?? params.get('error')
      if (oauthError) { setFailed(oauthError); return }

      // PKCE returns a code to exchange; implicit flow puts tokens in the
      // fragment, which detectSessionInUrl has already consumed by now.
      const code = params.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error && !cancelled) { setFailed(error.message); return }
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (!data.session?.user) { setFailed('We could not complete the sign-in.'); return }

      const dest = await applySessionAndResolveDestination(
        data.session.user,
        params.get('next'),
      )
      if (!cancelled) navigate(dest, { replace: true })
    })()

    return () => { cancelled = true }
  }, [navigate, params])

  if (failed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm text-center">
        <AlertTriangle size={44} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sign-in didn’t finish</h1>
        <p className="text-sm text-gray-500 mb-6 break-words">{failed}</p>
        <Link to="/login" className="btn-primary w-full">Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  )
}
