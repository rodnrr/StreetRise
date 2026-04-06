import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'login'|'signup'>('login')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const next          = params.get('next') ?? '/portal/dashboard'
  const { setAuth }   = useAuthStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error: authError } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (data.user) {
        // Fetch provider profile
        const { data: provider } = await supabase
          .from('providers')
          .select('id, role, verification_status')
          .eq('user_id', data.user.id)
          .single()
        setAuth({
          userId:             data.user.id,
          userEmail:          data.user.email ?? '',
          role:               (provider?.role as 'provider'|'admin'|'super_admin') ?? 'provider',
          providerId:         provider?.id,
          verificationStatus: (provider?.verification_status as 'pending'|'verified'|'rejected'|'suspended') ?? null,
        })
        // New users (no provider record yet) go to onboarding; existing users go to next destination
        const destination = (!provider && mode === 'signup') ? '/portal/onboarding' : next
        navigate(destination, { replace: true })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="error-text text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-primary-600 font-medium hover:underline">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
