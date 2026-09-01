import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const { t }               = useI18n()
  const [params]            = useSearchParams()
  const [email, setEmail]   = useState(params.get('email') ?? '')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    // Deliberately not surfaced per-address: telling an anonymous visitor
    // whether a given email has an account here would let anyone test which
    // organizations' staff are registered. Rate-limit errors are worth
    // showing, since the user can act on those by waiting.
    if (err && /rate|limit|too many/i.test(err.message)) {
      setError(t('forgotPassword.err.rateLimited'))
      return
    }
    setSent(true)
  }

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm text-center">
        <MailCheck size={44} className="text-success-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('forgotPassword.checkEmailTitle')}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {t('forgotPassword.mayHaveSentTo')} <strong className="break-all">{email}</strong>,{' '}
          {t('forgotPassword.linkSentAndExpiry')}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          {t('forgotPassword.nothingArriving')}
        </p>
        <Link to="/login" className="btn-secondary w-full">{t('forgotPassword.backToSignIn')}</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-sm mx-auto mb-3">SR</div>
          <h1 className="text-xl font-bold text-gray-900">{t('forgotPassword.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="label">{t('forgotPassword.email')}</label>
            <input
              id="reset-email"
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          {error && <p className="error-text text-center">{error}</p>}
          <button type="submit" disabled={loading || !email.trim()} className="btn-primary w-full">
            {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
          </button>
        </form>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mt-5"
        >
          <ArrowLeft size={14} /> {t('forgotPassword.backToSignIn')}
        </Link>
      </div>
    </div>
  )
}
