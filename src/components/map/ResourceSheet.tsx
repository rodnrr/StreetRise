import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, Globe, MapPin, Users, X, CheckCircle, Clock, Navigation,
  MessageSquare, CalendarCheck, ArrowRight,
} from 'lucide-react'
import clsx from 'clsx'
import {
  CATEGORY_EMOJI,
  RESOURCE_TYPE_LABEL_KEY,
  GENDER_POLICY_LABEL_KEY,
  POPULATION_FOCUS_LABEL_KEY,
} from '@/lib/mapFilters'
import { formatDistance } from '@/lib/geo'
import { useI18n } from '@/lib/i18n'
import type { Resource } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  available: 'badge-available',
  limited:   'badge-limited',
  full:      'badge-full',
  unknown:   'badge-unknown',
  closed:    'badge-unknown',
}

function availabilityLabel(r: Resource, t: (key: string) => string) {
  const shelter = r.category === 'shelter'
  const labels: Record<string, string> = shelter
    ? {
        available: t('status.bedsAvailableTitle'),
        limited: t('status.limitedBedsTitle'),
        full: t('status.shelterFull'),
        unknown: t('status.availabilityUnknown'),
        closed: t('status.closed'),
      }
    : {
        available: t('status.openNowTitle'),
        limited: t('status.limitedAvailability'),
        full: t('status.unavailable'),
        unknown: t('status.availabilityUnknown'),
        closed: t('status.closed'),
      }
  return labels[r.availability_status] ?? t('status.availabilityUnknown')
}

/**
 * Shelters take a spot request; everything else takes a help request.
 * Never "book" or "reserve" — nothing here is a confirmed reservation.
 */
function requestLabel(r: Resource, t: (key: string) => string) {
  if (r.availability_status === 'full' || r.availability_status === 'closed') return t('booking.joinWaitlist')
  return r.category === 'shelter' ? t('booking.requestSpot') : t('booking.requestHelp')
}

function directionsUrl(r: Resource) {
  if (r.lat != null && r.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`
  }
  const dest = [r.address?.street, r.address?.city, r.address?.state, r.address?.zip].filter(Boolean).join(', ')
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` : null
}

const FACILITIES: { key: keyof Resource; icon: string; labelKey: string }[] = [
  { key: 'has_showers',               icon: '🚿', labelKey: 'resourceSheet.facility.showers' },
  { key: 'has_restrooms',             icon: '🚻', labelKey: 'resourceSheet.facility.restrooms' },
  { key: 'serves_meals',              icon: '🍽️', labelKey: 'resourceSheet.facility.meals' },
  { key: 'has_laundry',               icon: '🫧',  labelKey: 'resourceSheet.facility.laundry' },
  { key: 'pet_friendly',              icon: '🐾', labelKey: 'resourceSheet.facility.petsOk' },
  { key: 'wheelchair_accessible',     icon: '♿', labelKey: 'resourceSheet.facility.accessible' },
  { key: 'public_transit_accessible', icon: '🚌', labelKey: 'resourceSheet.facility.nearTransit' },
]

/** One action tile in the grid. Renders as a link, an anchor, or nothing. */
function Action({
  to, href, external, icon, label, tone = 'secondary', onNavigate,
}: {
  to?: string
  href?: string
  external?: boolean
  icon: React.ReactNode
  label: string
  tone?: 'primary' | 'secondary' | 'call'
  onNavigate?: () => void
}) {
  const className = clsx(
    'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold',
    'transition-colors active:scale-[0.98] select-none text-center',
    tone === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700',
    tone === 'call'    && 'bg-success-600 text-white hover:bg-success-500',
    tone === 'secondary' && 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  )

  if (href) {
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={className}
      >
        {icon}
        {label}
      </a>
    )
  }
  return (
    <Link to={to!} className={className} onClick={onNavigate}>
      {icon}
      {label}
    </Link>
  )
}

interface Props {
  resource: Resource
  distanceKm: number | null
  onClose: () => void
}

export default function ResourceSheet({ resource: r, distanceKm, onClose }: Props) {
  const { t } = useI18n()
  // Escape closes the sheet — the backdrop is not the only way out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const emoji = CATEGORY_EMOJI[r.category] ?? '📍'
  const isConfidential = r.access_type === 'confidential_address' || r.access_type === 'phone_intake'
  const isDV = r.population_focus?.includes('domestic_violence')
  const hideAddress = isDV && isConfidential
  const directions = directionsUrl(r)
  const hours = (r.hours_of_operation as { summary?: string } | null)?.summary
  const showBeds = r.category === 'shelter' && r.beds_total != null
  const facilities = FACILITIES.filter((f) => r[f.key])

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={r.name}
        className={clsx(
          'fixed z-[65] bg-white shadow-2xl flex flex-col animate-slide-up',
          // Mobile: bottom sheet.  Desktop: centred dialog.
          'inset-x-0 bottom-0 rounded-t-3xl max-h-[88dvh]',
          'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[30rem]',
          'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:max-h-[85dvh]',
        )}
      >
        {/* Grab handle (mobile affordance) */}
        <div className="bottom-sheet-handle shrink-0 md:hidden" />

        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-4 pt-3 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={STATUS_BADGE[r.availability_status]}>{availabilityLabel(r, t)}</span>
              {r.verification_status === 'verified' && (
                <span className="badge bg-emerald-50 text-emerald-700 gap-1">
                  <CheckCircle size={11} /> {t('badge.staffVerified')}
                </span>
              )}
              {r.verification_status === 'pending' && (
                <span className="badge bg-amber-50 text-amber-700 gap-1">
                  <Clock size={11} /> {t('badge.communityListed')}
                </span>
              )}
            </div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">
              {emoji} {r.name}
            </h2>
            {hideAddress ? (
              <p className="text-xs text-gray-500 mt-1">📞 {t('resourceSheet.callForLocationAndIntake')}</p>
            ) : (
              <p className="text-xs text-gray-500 flex items-start gap-1 mt-1">
                <MapPin size={12} className="mt-px shrink-0" />
                <span>
                  {[r.address?.street, r.address?.city].filter(Boolean).join(', ')}
                  {distanceKm != null && (
                    <span className="text-gray-400"> · {formatDistance(distanceKm)} {t('resourceSheet.away')}</span>
                  )}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-icon shrink-0 text-gray-400 hover:text-gray-700 -mt-1 -mr-1"
            aria-label={t('resourceSheet.closeAria')}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {showBeds && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
              <Users size={15} className="text-gray-500 shrink-0" />
              <span className="text-sm text-gray-700">
                <span className="font-bold text-gray-900">{r.beds_available ?? '?'}</span> {t('resourceSheet.of')}{' '}
                <span className="font-bold">{r.beds_total}</span> {t('resourceSheet.bedsAvailableLabel')}
              </span>
              {r.beds_updated_at && (
                <span className="text-xs text-gray-400 ml-auto shrink-0">
                  {new Date(r.beds_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {hours && (
            <p lang="en" className="text-sm text-gray-700 flex items-center gap-2">
              <Clock size={14} className="text-gray-400 shrink-0" />
              {hours}
            </p>
          )}

          {r.description && (
            <p lang="en" className="text-sm text-gray-600 leading-relaxed">{r.description}</p>
          )}

          {(r.resource_type || r.population_focus?.length) && (
            <div className="flex flex-wrap gap-1.5">
              {r.resource_type && (
                <span className="badge bg-blue-50 text-blue-700">
                  {RESOURCE_TYPE_LABEL_KEY[r.resource_type] ? t(RESOURCE_TYPE_LABEL_KEY[r.resource_type]) : r.resource_type}
                </span>
              )}
              {r.population_focus?.map((tag) => (
                <span key={tag} className="badge bg-purple-50 text-purple-700">
                  {POPULATION_FOCUS_LABEL_KEY[tag] ? t(POPULATION_FOCUS_LABEL_KEY[tag]) : tag}
                </span>
              ))}
            </div>
          )}

          {facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {facilities.map(({ icon, labelKey }) => (
                <span key={labelKey} className="badge bg-gray-50 text-gray-600 gap-1">
                  {icon} {t(labelKey)}
                </span>
              ))}
            </div>
          )}

          {/* Access conditions worth knowing before you travel */}
          <div className="flex flex-wrap gap-1.5">
            {r.walk_ins_accepted && <span className="badge bg-green-50 text-green-700">{t('status.walkInsOk')}</span>}
            {!r.requires_id && <span className="badge bg-blue-50 text-blue-700">{t('resourceSheet.noIdNeeded')}</span>}
            {r.requires_referral && <span className="badge bg-amber-50 text-amber-700">{t('status.referralNeeded')}</span>}
            {r.phone_required_before_arrival && <span className="badge bg-amber-50 text-amber-700">{t('status.callFirst')}</span>}
            {r.gender_policy && r.gender_policy !== 'unknown' && r.gender_policy !== 'gender_inclusive' && (
              <span className="badge bg-gray-100 text-gray-700">
                {GENDER_POLICY_LABEL_KEY[r.gender_policy] ? t(GENDER_POLICY_LABEL_KEY[r.gender_policy]) : r.gender_policy}
              </span>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div
          className="shrink-0 border-t border-gray-100 p-3 grid grid-cols-2 gap-2
                     pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          {r.phone && (
            <Action
              href={`tel:${r.phone}`}
              icon={<Phone size={16} />}
              label={t('resourceSheet.call')}
              tone="call"
            />
          )}
          <Action
            to={`/book/${r.id}`}
            icon={<CalendarCheck size={16} />}
            label={requestLabel(r, t)}
            tone="primary"
          />
          <Action
            to={`/book/${r.id}?intent=question`}
            icon={<MessageSquare size={16} />}
            label={t('booking.askQuestion')}
          />
          {r.website && (
            <Action href={r.website} external icon={<Globe size={16} />} label={t('resourceSheet.website')} />
          )}
          {/* Gated on isConfidential, not hideAddress: a confidential-address or
              phone-intake listing must never get a directions link, whether or
              not it is also tagged domestic violence. The list row already tells
              people to call for the location. */}
          {directions && !isConfidential && (
            <Action href={directions} external icon={<Navigation size={16} />} label={t('resourceSheet.directions')} />
          )}
          <Link
            to={`/resources/${r.id}`}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2 text-sm
                       font-medium text-primary-600 hover:text-primary-700"
          >
            {t('resourceSheet.fullDetails')} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </>
  )
}
