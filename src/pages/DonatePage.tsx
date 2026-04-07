import { useState, useEffect } from 'react'
import { Heart, CheckCircle, Shield, Zap, Loader2 } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const PRESET_AMOUNTS = [10, 25, 50, 100, 250]

const IMPACT = [
  { amount: 10,  label: 'Covers 1 month of map hosting costs' },
  { amount: 25,  label: 'Pays for SMS alerts for 50 providers' },
  { amount: 50,  label: 'Funds moderation for a week' },
  { amount: 100, label: 'Keeps the platform running for 2 weeks' },
  { amount: 250, label: 'Sponsors a new city expansion' },
]

const TRUST_BADGES = [
  { icon: Shield,       label: 'Secure payment via Stripe' },
  { icon: CheckCircle, label: '100% goes to platform operations' },
  { icon: Zap,         label: 'No ads. Ever.' },
]

export default function DonatePage() {
  const [amount, setAmount]   = useState<number>(25)
  const [custom, setCustom]   = useState('')
  const [frequency, setFreq]  = useState<'once' | 'monthly'>('once')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  // Detect Stripe redirect back to /donate?success=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setDone(true)
      window.history.replaceState({}, '', '/donate')
    }
  }, [])

  const finalAmount = custom ? parseInt(custom) : amount
  const impact      = IMPACT.find(i => i.amount <= finalAmount)

  async function handleCheckout() {
    if (!finalAmount || finalAmount < 1) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ amount: finalAmount, frequency }),
        }
      )
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not start checkout')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (done) return (
    <div className="max-w-md mx-auto px-4 pt-20 text-center">
      <Heart size={56} className="text-danger-500 mx-auto mb-4" fill="currentColor" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you! 💙</h1>
      <p className="text-gray-500 mb-6">Your support keeps StreetRise free for everyone. You'll receive a receipt by email.</p>
      <a href="/" className="btn-primary">Back to Home</a>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-10 pb-24 md:pb-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Heart size={28} className="text-danger-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Support StreetRise</h1>
        <p className="text-gray-500 mt-1 text-sm max-w-sm mx-auto">
          StreetRise is free for everyone in need. Your donation helps us verify more providers and keep listings current.
        </p>
      </div>

      {/* Frequency */}
      <div className="flex rounded-xl border border-gray-200 p-1 mb-5">
        {(['once', 'monthly'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFreq(f)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
              frequency === f ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f === 'once' ? 'One time' : 'Monthly'}
          </button>
        ))}
      </div>

      {/* Amount picker */}
      <div className="card mb-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Choose an amount</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {PRESET_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setAmount(a); setCustom('') }}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                amount === a && !custom
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-gray-500 text-sm">$</span>
          <input
            type="number"
            min={1}
            placeholder="Custom amount"
            value={custom}
            onChange={e => { setCustom(e.target.value); setAmount(0) }}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Impact message */}
        {impact && (
          <div className="mt-3 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            💡 ${finalAmount} → {impact.label}
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className="flex flex-col gap-2 mb-6">
        {TRUST_BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 text-sm text-gray-600">
            <Icon size={15} className="text-success-600 shrink-0" />
            {label}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={!finalAmount || finalAmount < 1 || loading}
        className="btn-primary w-full btn-lg gap-2"
      >
        {loading
          ? <Loader2 size={18} className="animate-spin" />
          : <Heart size={18} />
        }
        {loading
          ? 'Redirecting to Stripe…'
          : `Donate $${finalAmount || '—'}${frequency === 'monthly' ? '/mo' : ''}`
        }
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        Powered by Stripe. Your payment info is never stored by StreetRise.
      </p>
    </div>
  )
}
