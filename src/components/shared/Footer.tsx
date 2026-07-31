import { Link } from 'react-router-dom'
import { Phone, Mail, ArrowRight } from 'lucide-react'

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/accessibility', label: 'Accessibility' },
]

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white px-4 py-8 pb-24 md:pb-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm">

        {/* Brand */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-primary-600 dark:text-primary-400">
            <span className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center text-white text-xs font-black">SR</span>
            StreetRise
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Free for everyone in need. Connecting people with real local services across Florida.
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide dark:text-slate-300">Contact & Support</p>
          <a
            href="mailto:Info@streetrise.org"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors dark:text-slate-400"
          >
            <Mail size={13} className="shrink-0" />
            Info@streetrise.org
          </a>
          <a
            href="tel:8135864066"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors dark:text-slate-400"
          >
            <Phone size={13} className="shrink-0" />
            813-586-4066
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            Contact page <ArrowRight size={12} />
          </Link>
        </div>

        {/* Company */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide dark:text-slate-300">Company</p>
          <nav className="flex flex-col gap-1.5">
            <Link to="/about" className="text-xs text-gray-500 hover:text-primary-600 transition-colors dark:text-slate-400">About</Link>
            <Link to="/blog" className="text-xs text-gray-500 hover:text-primary-600 transition-colors dark:text-slate-400">Blog</Link>
            <Link to="/community-voices" className="text-xs text-gray-500 hover:text-primary-600 transition-colors dark:text-slate-400">Community Voices</Link>
            <Link to="/partner-with-us" className="text-xs text-gray-500 hover:text-primary-600 transition-colors dark:text-slate-400">Partner With Us</Link>
          </nav>
        </div>

        {/* Providers */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide dark:text-slate-300">For Providers</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Are you a shelter, food pantry, clinic, or community org? List your services for free.
          </p>
          <Link
            to="/provider/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            Become a Provider <ArrowRight size={12} />
          </Link>
        </div>

      </div>

      {/* Legal bar */}
      <div className="max-w-5xl mx-auto mt-6 flex flex-col-reverse items-center gap-3 border-t border-gray-100 pt-4 text-xs text-gray-300 sm:flex-row sm:justify-between dark:border-slate-800">
        <p>© {new Date().getFullYear()} StreetRise</p>
        <nav className="flex gap-4">
          {LEGAL_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="hover:text-primary-600 transition-colors">{label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
