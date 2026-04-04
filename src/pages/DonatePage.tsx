import { useState } from 'react'
import { Heart, CheckCircle, Shield, Zap } from 'lucide-react'

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
  const [done, setDone]       = useState(false)

  const finalAmount = custom ? parseInt(custom) : amount
  const impact      = IMPACT.find(i => i.amount <= finalAmount)

  function handleCheckout() {
    // In production: call Stripe Checkout with the selected price
    // stripe.redirectToCheckout({ lineItems: [{ price: VITE_STRIPE_PRICE_ID, quantity: 1 }], mode: 'payment' })
    // For now, show success state as placeholder
    setDone(true)
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
          StreetRise is free for everyone in need. Your donation keeps real-time shelter data flowing.
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

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={!finalAmount || finalAmount < 1}
        className="btn-primary w-full btn-lg gap-2"
      >
        <Heart size={18} />
        Donate ${finalAmount || '—'}{frequency === 'monthly' ? '/mo' : ''}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        Powered by Stripe. Your payment info is never stored by StreetRise.
      </p>
    </div>
  )
}
