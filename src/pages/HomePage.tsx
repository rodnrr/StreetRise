import { Link } from 'react-router-dom'
import { ArrowRight, Bell, Heart, Home, MapPin, ShieldCheck, UtensilsCrossed } from 'lucide-react'

const NEARBY_COUNTS = [
  { label: 'Shelters', count: 8, open: '2 open now', icon: Home, color: 'text-primary-600 bg-primary-100' },
  { label: 'Food Pantries', count: 5, open: '3 open now', icon: UtensilsCrossed, color: 'text-warning-600 bg-warning-100' },
  { label: 'Other Resources', count: 7, open: 'Open now', icon: ShieldCheck, color: 'text-info-600 bg-info-100' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden px-6 pt-16 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(113,231,197,0.25),transparent_45%)]" />
        <div className="relative mx-auto max-w-md">
          <p className="text-sm text-primary-200 mb-6 tracking-wide">Real-time resources. Real hope.</p>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Street<span className="text-primary-300">Rise</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-10">
            Find nearby shelter, food, and essential resources when you need them most.
          </p>
          <Link
            to="/map"
            className="inline-flex w-full items-center justify-between rounded-full bg-primary-300 px-6 py-4 text-lg font-semibold text-slate-900 shadow-lg shadow-primary-900/30"
          >
            Get Started
            <ArrowRight size={22} />
          </Link>
        </div>
      </section>

      <section className="rounded-t-[2rem] bg-slate-50 text-slate-900 px-5 py-6 min-h-[52vh]">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">StreetRise</h2>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                <MapPin size={14} />
                Current Location
              </div>
            </div>
            <button className="rounded-full bg-white p-3 shadow-sm" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Near You</h3>
              <Link to="/map" className="text-sm font-medium text-slate-500">See all</Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {NEARBY_COUNTS.map(({ label, count, open, icon: Icon, color }) => (
                <Link key={label} to="/map" className="rounded-2xl border border-slate-200 p-3 hover:border-primary-300">
                  <span className={`inline-flex rounded-full p-2 ${color}`}>
                    <Icon size={16} />
                  </span>
                  <p className="mt-2 text-2xl font-bold leading-none">{count}</p>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-primary-600 mt-1">{open}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> OPEN NOW
            </div>
            <h3 className="mt-3 text-2xl font-bold">Hope Haven Shelter</h3>
            <p className="mt-1 text-sm text-slate-600">123 Community Way, Atlanta, GA 30303 · 0.4 mi away</p>
            <p className="mt-3 text-sm text-slate-700">Emergency shelter providing a safe place to sleep, hot meals, showers, and support services.</p>
            <Link to="/map" className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-primary-800 px-4 py-3 text-white font-semibold">
              Get Directions
            </Link>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Heart size={14} className="text-danger-500" /> Your journey matters. We&apos;re here to help.
          </div>
        </div>
      </section>
    </div>
  )
}
