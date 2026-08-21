import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle,
  Heart,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { fetchMapResources, MIN_CONFIDENCE_SCORE } from '@/lib/mapFilters'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const PRESET_AMOUNTS = [10, 25, 50, 100]

const SUPPORT_AREAS = [
  {
    icon: RefreshCw,
    title: 'Keep information current',
    copy: 'Support ongoing review of hours, eligibility, availability, and provider details so listings remain useful when someone needs them.',
  },
  {
    icon: CheckCircle,
    title: 'Verify providers',
    copy: 'Help StreetRise confirm organizations, improve resource quality, and bring trustworthy services onto the public map.',
  },
  {
    icon: MapPin,
    title: 'Reach more communities',
    copy: 'Fund outreach, provider onboarding, and responsible expansion into communities where finding help is still harder than it should be.',
  },
]

const TRUST_POINTS = [
  'Secure checkout through Stripe',
  'StreetRise never stores your card information',
  'StreetRise stays free for people searching for help',
]

interface ImpactStats {
  resources: number
  communities: number
  categories: number
}

export default function DonatePage() {
  const [amount, setAmount] = useState<number>(25)
  const [custom, setCustom] = useState('')
  const [frequency, setFreq] = useState<'once' | 'monthly'>('once')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState<ImpactStats | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setDone(true)
      window.history.replaceState({}, '', '/donate')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadImpactStats() {
      try {
        const resources = await fetchMapResources()
        const publicResources = resources.filter(
          (resource) => (resource.confidence_score ?? 0) >= MIN_CONFIDENCE_SCORE,
        )
        const communities = new Set(
          publicResources
            .map((resource) => resource.address?.city?.trim())
            .filter((city): city is string => Boolean(city)),
        )
        const categories = new Set(publicResources.map((resource) => resource.category))

        if (!cancelled) {
          setStats({
            resources: publicResources.length,
            communities: communities.size,
            categories: categories.size,
          })
        }
      } catch {
        // The donation flow must remain usable if public map statistics fail.
      }
    }

    void loadImpactStats()
    return () => { cancelled = true }
  }, [])

  const finalAmount = useMemo(() => {
    if (!custom) return amount
    const parsed = Number.parseInt(custom, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }, [amount, custom])

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
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ amount: finalAmount, frequency }),
        },
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

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 md:py-24">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-10 text-center text-white md:px-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Heart size={32} fill="currentColor" />
            </div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Thank you</p>
            <h1 className="text-3xl font-bold md:text-4xl">You helped StreetRise keep moving.</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/85 md:text-base">
              Your support helps keep practical, accessible resource information available to people looking for the next place to go.
            </p>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-3 md:p-8">
            <Link to="/map" className="rounded-2xl border border-gray-200 p-4 transition hover:border-primary-300 hover:bg-primary-50">
              <MapPin size={20} className="mb-3 text-primary-600" />
              <p className="font-semibold text-gray-900">Explore StreetRise</p>
              <p className="mt-1 text-sm text-gray-500">See the resources your support helps keep accessible.</p>
            </Link>
            <Link to="/blog" className="rounded-2xl border border-gray-200 p-4 transition hover:border-primary-300 hover:bg-primary-50">
              <Sparkles size={20} className="mb-3 text-primary-600" />
              <p className="font-semibold text-gray-900">Read what we're building</p>
              <p className="mt-1 text-sm text-gray-500">Follow StreetRise updates, launches, and field work.</p>
            </Link>
            <Link to="/" className="rounded-2xl border border-gray-200 p-4 transition hover:border-primary-300 hover:bg-primary-50">
              <ArrowRight size={20} className="mb-3 text-primary-600" />
              <p className="font-semibold text-gray-900">Back to StreetRise</p>
              <p className="mt-1 text-sm text-gray-500">Return to the main app and keep exploring.</p>
            </Link>
          </div>

          <p className="px-6 pb-8 text-center text-xs text-gray-400">
            Stripe will email your payment receipt to the address used at checkout.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="pb-24 md:pb-14">
      <section className="relative overflow-hidden border-b border-primary-100 bg-gradient-to-br from-primary-50 via-white to-orange-50">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-orange-100/60 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-6 md:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm backdrop-blur">
              <Heart size={14} fill="currentColor" />
              Support StreetRise
            </div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-950 md:text-5xl md:leading-[1.08]">
              Help someone find the next safe place to go.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 md:text-lg">
              StreetRise helps people find shelters, food, hygiene services, healthcare, employment support, clothing, and other essential resources — without charging the person searching for help.
            </p>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600">
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-center gap-2">
                  <CheckCircle size={16} className="shrink-0 text-success-600" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-900/5 md:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-900">Choose how you want to help</p>
              <p className="mt-1 text-sm text-gray-500">Every contribution supports StreetRise operations, verification, outreach, and responsible growth.</p>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
              {(['once', 'monthly'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFreq(value)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    frequency === value
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {value === 'once' ? 'Give once' : 'Give monthly'}
                </button>
              ))}
            </div>

            {frequency === 'monthly' && (
              <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm text-primary-800">
                <span className="font-semibold">Monthly support matters.</span> Reliable giving helps StreetRise plan verification and outreach continuously instead of campaign by campaign.
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setAmount(value); setCustom('') }}
                  className={`rounded-xl border py-3 text-sm font-bold transition ${
                    amount === value && !custom
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  ${value}
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="sr-only">Custom donation amount</span>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
                <span className="font-semibold text-gray-500">$</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Other amount"
                  value={custom}
                  onChange={(event) => { setCustom(event.target.value); setAmount(0) }}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
                />
              </div>
            </label>

            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm leading-5 text-gray-600">
              <span className="font-semibold text-gray-900">Your support helps keep resource information accessible and current.</span> Donations are not tied to a single listing or service; they support the work required to operate and improve StreetRise.
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={!finalAmount || finalAmount < 1 || loading}
              className="btn-primary btn-lg mt-5 w-full gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />}
              {loading
                ? 'Opening secure checkout…'
                : `Donate $${finalAmount || '—'}${frequency === 'monthly' ? '/month' : ''}`}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Shield size={13} />
              Secure payment processing by Stripe
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
            <div className="mb-5 flex items-center justify-center gap-2 text-center text-sm font-semibold text-gray-600">
              <Sparkles size={16} className="text-primary-600" />
              StreetRise in action — pulled from the public resource map
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-200 text-center">
              <div className="px-2">
                <p className="text-2xl font-bold text-gray-950 md:text-3xl">{stats.resources.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500 md:text-sm">public resources</p>
              </div>
              <div className="px-2">
                <p className="text-2xl font-bold text-gray-950 md:text-3xl">{stats.communities.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500 md:text-sm">communities represented</p>
              </div>
              <div className="px-2">
                <p className="text-2xl font-bold text-gray-950 md:text-3xl">{stats.categories.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500 md:text-sm">service categories</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-600">What support makes possible</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Useful information takes work to keep useful.</h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            StreetRise is more than a directory. Providers change hours, programs change eligibility, new services open, and old information goes stale. Support helps us keep doing the work between those changes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {SUPPORT_AREAS.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Icon size={21} />
              </div>
              <h3 className="text-lg font-bold text-gray-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-gray-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_auto] md:items-center md:px-6 md:py-14">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary-200">
              <Users size={17} />
              Built for access
            </div>
            <h2 className="text-2xl font-bold md:text-3xl">People searching for help should not hit a paywall.</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300 md:text-base">
              StreetRise is designed to keep finding resources free and straightforward. Donations help cover the operational work behind that public access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-950 transition hover:bg-gray-100"
          >
            Support StreetRise
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  )
}
