import { Link } from 'react-router-dom'
import { Phone, Mail, ArrowRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white px-4 py-8 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">

        {/* Brand */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-primary-600">
            <span className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center text-white text-xs font-black">SR</span>
            StreetRise
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Free for everyone in need. Connecting people with real local services in Tampa Bay.
          </p>
          <p className="text-xs text-gray-300">
            © {new Date().getFullYear()} StreetRise
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contact & Support</p>
          <a
            href="mailto:info@streetrise.org"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors"
          >
            <Mail size={13} className="shrink-0" />
            info@streetrise.org
          </a>
          <a
            href="tel:8135864066"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors"
          >
            <Phone size={13} className="shrink-0" />
            813-586-4066
          </a>
        </div>

        {/* Providers */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">For Providers</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Are you a shelter, food pantry, clinic, or community org? List your services for free.
          </p>
          <Link
            to="/provider/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline"
          >
            Become a Provider <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </footer>
  )
}
