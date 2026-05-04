import { Link } from 'react-router-dom'
import {
  BedDouble, CalendarDays, Briefcase, Phone,
  CheckCircle, Clock, ShieldCheck, ArrowRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: BedDouble,
    color: 'bg-primary-50 text-primary-600',
    title: 'Live availability updates',
    body: 'Update bed counts, food pantry status, and service hours in real time so people always see accurate info before they arrive.',
  },
  {
    icon: CalendarDays,
    color: 'bg-purple-50 text-purple-600',
    title: 'Manage booking requests',
    body: 'Receive, confirm, waitlist, or decline resource requests through a simple dashboard — no back-and-forth phone tags.',
  },
  {
    icon: Briefcase,
    color: 'bg-amber-50 text-amber-600',
    title: 'Post work exchange opportunities',
    body: 'List volunteer slots, paid positions, internships, and skills-trade opportunities to connect with people ready to contribute.',
  },
  {
    icon: Phone,
    color: 'bg-green-50 text-green-600',
    title: 'Be the on-call contact',
    body: 'Designate a point person for your organization so case managers and individuals always know exactly who to reach.',
  },
]

const STEPS = [
  {
    number: '1',
    title: 'Create your account',
    body: 'Sign up with your work email and fill out a short form with your organization details — takes under 3 minutes.',
  },
  {
    number: '2',
    title: 'Manual review',
    body: 'Our team verifies your organization within 1–2 business days. This keeps the directory trustworthy for everyone who depends on it.',
  },
  {
    number: '3',
    title: 'Go live on the map',
    body: 'Once approved, you get full portal access — add listings, update availability, and start receiving requests immediately.',
  },
]

export default function ProviderLandingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-12 space-y-12">

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full px-3 py-1.5 mb-1">
          <ShieldCheck size={13} /> Free for local service providers
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Help people find you<br />when it matters most
        </h1>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          StreetRise connects shelters, food pantries, clinics, and community orgs
          with people in Tampa Bay who need their services — in real time.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/login?signup=1" className="btn-primary btn-lg gap-2">
            Apply as a provider <ArrowRight size={17} />
          </Link>
          <Link to="/login" className="btn-secondary btn-lg">
            Sign in
          </Link>
        </div>
      </div>

      {/* What you can do */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">What you can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="card space-y-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
        <div className="space-y-3">
          {STEPS.map(({ number, title, body }) => (
            <div key={number} className="flex gap-4 card items-start">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {number}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification trust block */}
      <div className="card border border-primary-100 bg-primary-50/40 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-primary-600 shrink-0" />
          <p className="font-semibold text-gray-900 text-sm">Manually reviewed — no automated approvals</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          A real person on our team reviews every application to confirm you represent the
          organization you're listing. Approved providers receive a <span className="inline-flex items-center gap-0.5 font-medium text-primary-700">
            <CheckCircle size={11} /> Staff Verified
          </span> badge on all their listings — a visible signal that a real person on our team has confirmed the listing.
        </p>
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          <Clock size={13} className="shrink-0" />
          Review typically takes 1–2 business days. You'll get an email when approved.
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-3">
        <p className="text-sm text-gray-500">Ready to make your services findable?</p>
        <Link to="/login?signup=1" className="btn-primary btn-lg gap-2 w-full sm:w-auto">
          Apply as a provider <ArrowRight size={17} />
        </Link>
        <p className="text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>

    </div>
  )
}
