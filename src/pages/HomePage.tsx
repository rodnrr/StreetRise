import { Link } from 'react-router-dom'
import { MapPin, Briefcase, Heart, ArrowRight, CheckCircle } from 'lucide-react'

const CATEGORIES = [
  { label: 'Shelter',       color: 'bg-blue-100 text-blue-700',   emoji: '🏠' },
  { label: 'Food',          color: 'bg-green-100 text-green-700',  emoji: '🍽' },
  { label: 'Work Exchange', color: 'bg-purple-100 text-purple-700', emoji: '🤝' },
  { label: 'Mental Health', color: 'bg-pink-100 text-pink-700',    emoji: '💙' },
  { label: 'Medical',       color: 'bg-red-100 text-red-700',      emoji: '⚕️' },
  { label: 'Legal Help',    color: 'bg-yellow-100 text-yellow-700', emoji: '⚖️' },
]

const TRUST_POINTS = [
  'Verified providers are confirmed by StreetRise staff and clearly badged on every listing',
  'Community Listed resources are publicly submitted — a wider net, clearly labeled so you know what you\'re looking at',
  'Free to use — no account required to search',
  'Anonymous booking option for privacy',
]

export default function HomePage() {
  return (
    <div className="pb-20 md:pb-0">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Find shelter, food &amp; support — right now
          </h1>
          <p className="text-primary-100 text-lg md:text-xl mb-8 leading-relaxed">
            StreetRise maps local shelters, food, and support services — verified
            providers and community listings, clearly labeled. No sign-up required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/map" className="btn bg-white text-primary-700 hover:bg-primary-50 btn-lg font-bold shadow-lg">
              <MapPin size={20} />
              Find Resources Near Me
            </Link>
            <Link to="/work" className="btn border-2 border-white/40 text-white hover:bg-white/10 btn-lg">
              <Briefcase size={18} />
              Work Exchange
            </Link>
          </div>
        </div>
      </section>

      {/* Category quick-links */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Browse by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(({ label, color, emoji }) => (
            <Link
              key={label}
              to={`/map?category=${encodeURIComponent(label.toLowerCase().replace(/ /g, '_'))}`}
              className={`card-hover flex items-center gap-3 ${color}`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="font-semibold text-sm">{label}</span>
              <ArrowRight size={14} className="ml-auto opacity-60" />
            </Link>
          ))}
        </div>
      </section>

      {/* Trust indicators */}
      <section className="bg-gray-50 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-5 text-center">Why trust StreetRise?</h2>
          <ul className="space-y-3">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle size={18} className="text-success-600 mt-0.5 shrink-0" />
                <span className="text-gray-700 text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA — donate */}
      <section className="px-4 py-12 text-center">
        <div className="max-w-md mx-auto">
          <Heart size={32} className="text-danger-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Help us keep the lights on</h2>
          <p className="text-gray-500 text-sm mb-5">
            StreetRise is free for everyone. Your donation helps us verify more providers and keep listings current.
          </p>
          <Link to="/donate" className="btn-primary btn-lg">
            Donate Now
          </Link>
        </div>
      </section>
    </div>
  )
}
