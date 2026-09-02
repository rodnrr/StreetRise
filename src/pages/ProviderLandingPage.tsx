import { Link } from 'react-router-dom'
import {
  BedDouble, CalendarDays, Briefcase, Phone,
  CheckCircle, Clock, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const FEATURES = [
  {
    icon: BedDouble,
    color: 'bg-primary-50 text-primary-600',
    titleKey: 'providerLanding.feature.availability.title',
    bodyKey: 'providerLanding.feature.availability.body',
  },
  {
    icon: CalendarDays,
    color: 'bg-purple-50 text-purple-600',
    titleKey: 'providerLanding.feature.bookings.title',
    bodyKey: 'providerLanding.feature.bookings.body',
  },
  {
    icon: Briefcase,
    color: 'bg-amber-50 text-amber-600',
    titleKey: 'providerLanding.feature.workExchange.title',
    bodyKey: 'providerLanding.feature.workExchange.body',
  },
  {
    icon: Phone,
    color: 'bg-green-50 text-green-600',
    titleKey: 'providerLanding.feature.onCall.title',
    bodyKey: 'providerLanding.feature.onCall.body',
  },
]

const STEPS = [
  {
    number: '1',
    titleKey: 'providerLanding.step.createAccount.title',
    bodyKey: 'providerLanding.step.createAccount.body',
  },
  {
    number: '2',
    titleKey: 'providerLanding.step.review.title',
    bodyKey: 'providerLanding.step.review.body',
  },
  {
    number: '3',
    titleKey: 'providerLanding.step.goLive.title',
    bodyKey: 'providerLanding.step.goLive.body',
  },
]

export default function ProviderLandingPage() {
  const { t } = useI18n()
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-12 space-y-12">

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full px-3 py-1.5 mb-1">
          <ShieldCheck size={13} /> {t('providerLanding.eyebrow')}
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          {t('providerLanding.headlineLine1')}<br />{t('providerLanding.headlineLine2')}
        </h1>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          {t('providerLanding.subhead')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/login?signup=1" className="btn-primary btn-lg gap-2">
            {t('providerLanding.applyAsProvider')} <ArrowRight size={17} />
          </Link>
          <Link to="/login" className="btn-secondary btn-lg">
            {t('providerLanding.signIn')}
          </Link>
        </div>

        {/* Most orgs on the map were seeded from public information and are
            waiting to be claimed — steer them there before they register a
            duplicate. providers.user_id is UNIQUE, so an account that
            registers a new org can never claim an existing one. */}
        <div className="rounded-2xl bg-primary-50/60 border border-primary-100 p-4 mt-4 text-left sm:text-center">
          <p className="text-sm text-gray-700">
            <strong>{t('providerLanding.alreadyOnStreetRise')}</strong> {t('providerLanding.alreadyOnStreetRiseBody')}
          </p>
          <Link to="/claim" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline mt-1.5">
            {t('providerLanding.findAndClaim')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* What you can do */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('providerLanding.whatYouCanDo')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, color, titleKey, bodyKey }) => (
            <div key={titleKey} className="card space-y-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{t(titleKey)}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('providerLanding.howItWorks')}</h2>
        <div className="space-y-3">
          {STEPS.map(({ number, titleKey, bodyKey }) => (
            <div key={number} className="flex gap-4 card items-start">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {number}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t(titleKey)}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification trust block */}
      <div className="card border border-primary-100 bg-primary-50/40 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-primary-600 shrink-0" />
          <p className="font-semibold text-gray-900 text-sm">{t('providerLanding.reviewedTitle')}</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {t('providerLanding.reviewedBody')} <span className="inline-flex items-center gap-0.5 font-medium text-primary-700">
            <CheckCircle size={11} /> {t('badge.staffVerified')}
          </span> {t('providerLanding.reviewedBodyEnd')}
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          {t('providerLanding.communityListedBefore')}{' '}
          <span className="font-medium text-gray-700">{t('badge.communityListed')}</span>{' '}
          {t('providerLanding.communityListedAfter')}
        </p>
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          <Clock size={13} className="shrink-0" />
          {t('providerLanding.reviewTimeNote')}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-3">
        <p className="text-sm text-gray-500">{t('providerLanding.readyToBeFindable')}</p>
        <Link to="/login?signup=1" className="btn-primary btn-lg gap-2 w-full sm:w-auto">
          {t('providerLanding.applyAsProvider')} <ArrowRight size={17} />
        </Link>
        <p className="text-xs text-gray-400">
          {t('providerLanding.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">{t('providerLanding.signIn')}</Link>
        </p>
      </div>

    </div>
  )
}
