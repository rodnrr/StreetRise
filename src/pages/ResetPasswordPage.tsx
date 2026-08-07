import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [phase, setPhase]       = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  /**
   * A recovery link can arrive in either of two shapes depending on the
   * client's auth flow: an implicit-flow token in the URL *fragment*, which
   * `detectSessionInUrl` consumes automatically, or a PKCE `?code=` in the
   * query string, which has to be exchanged explicitly. Handling only one of
   * them would leave a dead reset link if the flow ever changes, so this
   * handles both and then simply asks whether a session exists.
   */
  useEffect(() => {
    let cancelled = false

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setPhase('ready')
    })

    ;(async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        try { await supabase.auth.exchangeCodeForSession(code) } catch { /* fall through */ }
      }
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setPhase(prev => (prev === 'ready' ? prev : data.session ? 'ready' : 'invalid'))
    })()

    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    setPhase('done')
  }

  if (phase === 'checking') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Checking your link…</p>
      </div>
    </div>
  )

  if (phase === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm text-center">
        <AlertTriangle size={44} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">This link has expired</h1>
        <p className="text-sm text-gray-500 mb-6">
          Password reset links are single-use and expire after about an hour.
          Request a fresh one and it’ll work.
        </p>
        <Link to="/forgot-password" className="btn-primary w-full">Send a new link</Link>
        <Link to="/login" className="btn-secondary w-full mt-2">Back to sign in</Link>
      </div>
    </div>
  )

  if (phase === 'done') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm text-center">
        <CheckCircle size={44} className="text-success-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
        <p className="text-sm text-gray-500 mb-6">You’re signed in with your new password.</p>
        <button onClick={() => navigate('/portal/dashboard', { replace: true })} className="btn-primary w-full">
          Continue
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-sm mx-auto mb-3">SR</div>
          <h1 className="text-xl font-bold text-gray-900">Choose a new password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="label">New password</label>
            <input
              id="new-password"
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="label">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              className="input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error && <p className="error-text text-center">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
