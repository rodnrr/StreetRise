import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Phone, Globe, MapPin, Clock, BedDouble, ChevronLeft, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { db } from '@/lib/supabase'
import {
  CATEGORY_EMOJI,
  RESOURCE_TYPE_LABEL_KEY,
  GENDER_POLICY_LABEL_KEY,
  POPULATION_FOCUS_LABEL_KEY,
  publicTags,
} from '@/lib/mapFilters'
import GetThere from '@/components/shared/GetThere'
import HousingEligibility from '@/components/housing/HousingEligibility'
import { normalizeHousingEmbed, isMissingHousingRelation } from '@/lib/housing'
import { useI18n } from '@/lib/i18n'
import { isNonWalkIn } from '@/lib/transport'
import type { Resource } from '@/types'

function VerificationBadge({ status }: { status: string }) {
  const { t } = useI18n()
  if (status === 'verified') {
    return (
      <span className="badge-verified shrink-0 flex items-center gap-1">
        <CheckCircle size={12} /> {t('badge.staffVerified')}
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
        <Clock size={12} /> {t('badge.communityListed')}
      </span>
    )
  }
  return null
}

const STATUS_COLOR: Record<string, string> = {
  available: 'badge-available',
  limited:   'badge-limited',
  full:      'badge-full',
  unknown:   'badge-unknown',
  closed:    'badge-unknown',
}

function getAvailabilityLabel(resource: Resource, t: (key: string) => string): string {
  if (resource.category === 'shelter') {
    const labels: Record<string, string> = {
      available: t('status.bedsAvailableTitle'),
      limited: t('status.limitedBedsTitle'),
      full: t('status.shelterFull'),
      unknown: t('status.availabilityUnknown'),
      closed: t('status.closed'),
    }
    return labels[resource.availability_status] ?? t('status.availabilityUnknown')
  }
  const labels: Record<string, string> = {
    available: t('status.openNowTitle'),
    limited: t('status.limitedAvailability'),
    full: t('status.unavailable'),
    unknown: t('status.availabilityUnknown'),
    closed: t('status.closed'),
  }
  return labels[resource.availability_status] ?? t('status.availabilityUnknown')
}

/**
 * Intake booleans predate housing's tri-state evidence model. On ordinary
 * resources the historical true/false labels are preserved. On housing,
 * however, `false` often means only "the source did not establish this" — it
 * must not become a public promise such as "No ID required" or "No need to
 * call first". Housing therefore renders only affirmative, source-backed
 * restrictions/capabilities from these legacy booleans; unknown negatives stay
 * silent and the UI tells the visitor to ask.
 */
function intakeRows(resource: Resource): [boolean, string, string][] {
  if (resource.category !== 'housing') {
    return [
      [resource.walk_ins_accepted,              'resourceDetail.walkInsAccepted',   'faq.intake.noWalkInsCallAhead'],
      [!resource.requires_id,                   'faq.intake.noIdRequired',           'resourceDetail.idRequiredToEnter'],
      [!resource.requires_referral,             'faq.intake.noReferralRequired',     'resourceDetail.referralRequired'],
      [!resource.phone_required_before_arrival, 'faq.intake.noNeedToCallFirst',      'faq.intake.callBeforeVisiting'],
    ]
  }

  const rows: [boolean, string, string][] = []
  if (resource.walk_ins_accepted) {
    rows.push([true, 'resourceDetail.walkInsAccepted', 'faq.intake.noWalkInsCallAhead'])
  }
  if (resource.requires_id) {
    rows.push([false, 'faq.intake.noIdRequired', 'resourceDetail.idRequiredToEnter'])
  }
  if (resource.requires_referral) {
    rows.push([false, 'faq.intake.noReferralRequired', 'resourceDetail.referralRequired'])
  }
  if (resource.phone_required_before_arrival) {
    rows.push([false, 'faq.intake.noNeedToCallFirst', 'faq.intake.callBeforeVisiting'])
  }
  return rows
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()

  const { data: resource, isLoading, isError, refetch } = useQuery<Resource | null>({
    queryKey: ['resource', id],
    queryFn:  async () => {
      // `id` and `claim_status` on the joined provider drive the "claim this
      // listing" prompt below. Unclaimed providers are publicly readable
      // (providers_unclaimed_read), so this join works for anonymous visitors.
      const PROVIDER_EMBED = 'providers(id, organization_name, website, claim_status)'
      // maybeSingle, NOT single: PostgREST's .single() raises PGRST116 when it
      // matches no row, so an unknown or withdrawn id would arrive here as an
      // "error" and hit the retryable failure screen below — the not-found
      // branch would be unreachable. maybeSingle returns data = null instead,
      // which keeps "this listing is gone" and "we could not load it" as the
      // two different things they are.
      const run = (select: string) =>
        db.resources().select(select).eq('id', id!).maybeSingle()

      let { data, error } = await run(`*, ${PROVIDER_EMBED}, housing:resource_housing_details(*)`)
      // Migrations are hand-applied while merging deploys, so this page can be
      // live before 057 exists. Retry without the embed rather than 404ing a
      // listing that is perfectly fine.
      if (error && isMissingHousingRelation(error)) {
        const retry = await run(`*, ${PROVIDER_EMBED}`)
        data = retry.data
        error = retry.error
      }
      if (error) throw error

      // Return null, do NOT fall through to the spread. `{ ...null }` is legal
      // and evaluates to `{}`, so spreading a missing row here produced a
      // TRUTHY `{ housing: null }` — the not-found branch below became
      // unreachable and the render crashed on `resource.address`. An unknown or
      // withdrawn id is a normal request, not an exception.
      if (!data) return null

      const row = data as unknown as Record<string, unknown>
      return {
        ...(row as unknown as Resource),
        housing: normalizeHousingEmbed(row.housing),
      } as Resource
    },
    enabled: !!id,
  })

  const owner = (resource as unknown as {
    providers?: { id: string; organization_name: string; claim_status?: string } | null
  } | null)?.providers ?? null

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`skeleton ${i === 1 ? 'h-48' : 'h-28'} w-full`} />
        ))}
      </div>
    )
  }

  // A failed request is not a missing listing. Rendering "not found" on an
  // outage tells somebody the place they were sent to no longer exists, which
  // is both false and the kind of false that makes them stop looking.
  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-20 text-center" role="alert">
        <p className="text-base font-semibold text-gray-900 dark:text-white">
          {t('resourceDetail.loadFailed')}
        </p>
        <p className="mt-2 text-base text-gray-600 dark:text-slate-400">
          {t('resourceDetail.loadFailedHint')}
        </p>
        <button type="button" onClick={() => refetch()} className="btn-primary mt-4">
          {t('resourceDetail.retry')}
        </button>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
        <p className="text-gray-500">{t('resourceDetail.notFound')}</p>
        <Link to="/map" className="btn-primary mt-4">{t('resourceDetail.backToMapButton')}</Link>
      </div>
    )
  }

  const visibleTags = publicTags(resource.tags)
  const hours      = resource.hours_of_operation as Record<string, { open: string; close: string; closed: boolean } | undefined>
  const showBeds   = resource.category === 'shelter' && resource.beds_total != null
  const emoji      = CATEGORY_EMOJI[resource.category] ?? '📍'

  // Confidential address logic.
  //
  // Keyed on access_type ALONE. It used to also require the
  // domestic_violence population tag, which meant a listing whose access_type
  // said "confidential" still published its street address unless someone had
  // remembered to tag it — the protection depended on a second, unrelated
  // field being right. That was latent while access_type could only be set in
  // SQL; it stopped being acceptable the moment the listing editors started
  // offering "Confidential address — do not publish" as a dropdown option,
  // because that label is a promise this render has to keep.
  const isConfidential = isNonWalkIn(resource)
  const hideAddress    = isConfidential

  // Facility items
  const facilities: { show: boolean; emoji: string; labelKey: string }[] = [
    { show: resource.has_showers,               emoji: '🚿', labelKey: 'resourceDetail.facility.showersAvailable' },
    { show: resource.has_restrooms,             emoji: '🚻', labelKey: 'resourceDetail.facility.restroomsAvailable' },
    { show: resource.serves_meals,              emoji: '🍽️', labelKey: 'resourceDetail.facility.mealsServed' },
    { show: resource.has_laundry,               emoji: '🫧', labelKey: 'resourceDetail.facility.laundryAvailable' },
    { show: resource.pet_friendly,              emoji: '🐾', labelKey: 'resourceDetail.facility.petsWelcome' },
    { show: resource.wheelchair_accessible,     emoji: '♿', labelKey: 'resourceDetail.facility.wheelchairAccessible' },
    { show: resource.public_transit_accessible, emoji: '🚌', labelKey: 'resourceDetail.facility.nearPublicTransit' },
    { show: resource.overnight_allowed === true,emoji: '🌙', labelKey: 'resourceDetail.facility.overnightStaysAllowed' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 md:pb-8 space-y-5">
      {/* Back */}
      <Link to="/map" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> {t('resourceDetail.backToMap')}
      </Link>

      {/* Hero */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className={`${STATUS_COLOR[resource.availability_status]} mb-2 inline-flex`}>
              {getAvailabilityLabel(resource, t)}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              {emoji} {resource.name}
            </h1>
            {hideAddress ? (
              <p className="text-sm text-gray-500 mt-1">📞 {t('resourceDetail.contactForLocationProcess')}</p>
            ) : (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={13} /> {resource.address.street}, {resource.address.city}, {resource.address.state}
              </p>
            )}
          </div>
          <VerificationBadge status={resource.verification_status} />
        </div>

        {/* Resource type + population focus */}
        {(resource.resource_type || resource.population_focus?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {resource.resource_type && (
              <span className="badge bg-blue-50 text-blue-700">
                {RESOURCE_TYPE_LABEL_KEY[resource.resource_type] ? t(RESOURCE_TYPE_LABEL_KEY[resource.resource_type]) : resource.resource_type}
              </span>
            )}
            {resource.population_focus?.map((tag) => (
              <span key={tag} className="badge bg-purple-50 text-purple-700">
                {POPULATION_FOCUS_LABEL_KEY[tag] ? t(POPULATION_FOCUS_LABEL_KEY[tag]) : tag}
              </span>
            ))}
          </div>
        )}

        {/* Gender policy */}
        {resource.gender_policy && resource.gender_policy !== 'unknown' && (
          <p className="text-sm text-gray-600 mb-3">
            👤 {GENDER_POLICY_LABEL_KEY[resource.gender_policy] ? t(GENDER_POLICY_LABEL_KEY[resource.gender_policy]) : resource.gender_policy}
          </p>
        )}

        <p lang="en" className="text-gray-700 text-sm leading-relaxed">{resource.description}</p>

        {/* Bed count */}
        {showBeds && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
            <BedDouble size={18} className="text-gray-500" />
            <div>
              <p className="font-semibold text-gray-900">
                {resource.beds_available ?? '?'}{' '}
                <span className="text-gray-400 font-normal">/ {resource.beds_total} {t('resourceSheet.bedsAvailableLabel')}</span>
              </p>
              {resource.beds_updated_at && (
                <p className="text-xs text-gray-400">
                  {t('resourceDetail.updated')} {new Date(resource.beds_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex gap-3">
          <Link to={`/book/${resource.id}`} className="btn-primary flex-1">
            {resource.category === 'shelter' ? t('booking.requestSpot') : t('booking.requestHelp')}
          </Link>
          {resource.phone && (
            <a href={`tel:${resource.phone}`} className="btn-secondary flex-1 text-center">
              {t('resourceSheet.call')}
            </a>
          )}
        </div>
      </div>

      {/* Intake requirements */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">{t('resourceDetail.intakeRequirements')}</h2>
        <div className="space-y-2">
          {intakeRows(resource).map(([ok, yesKey, noKey]) => (
            <div key={`${yesKey}:${noKey}`} className="flex items-center gap-2.5 text-sm">
              {ok
                ? <CheckCircle size={16} className="text-success-600 shrink-0" />
                : <XCircle     size={16} className="text-danger-500 shrink-0"  />}
              <span className={ok ? 'text-gray-700' : 'text-gray-500'}>{t(ok ? yesKey : noKey)}</span>
            </div>
          ))}
          {resource.category === 'housing' && (
            <p className="text-xs text-gray-500">{t('housing.notStated')}</p>
          )}
          {resource.age_min != null && (
            <p className="text-sm text-gray-600">🎂 {t('resourceDetail.ages')} {resource.age_min}{resource.age_max ? `–${resource.age_max}` : '+'}</p>
          )}
          {resource.languages_spoken?.length > 0 && (
            <p className="text-sm text-gray-600">🗣 {t('resourceDetail.languagesLabel')} {resource.languages_spoken.join(', ')}</p>
          )}
        </div>
      </div>

      {/* Facilities */}
      {facilities.some((f) => f.show) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">{t('resourceDetail.facilitiesAmenities')}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {facilities
              .filter((f) => f.show)
              .map(({ emoji: fEmoji, labelKey }) => (
                <div key={labelKey} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={14} className="text-success-600 shrink-0" />
                  {fEmoji} {t(labelKey)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Hours */}
      {Object.keys(hours).some((d) => hours[d as keyof typeof hours]) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock size={16} /> {t('resourceDetail.hoursOfOperation')}
          </h2>
          <div className="space-y-1">
            {DAYS.map((day) => {
              const h = hours[day]
              return (
                <div key={day} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{t(`faq.day.${day}`)}</span>
                  <span className={h?.closed ? 'text-gray-400' : 'text-gray-900 font-medium'}>
                    {h?.closed ? t('status.closed') : h ? `${h.open} – ${h.close}` : '—'}
                  </span>
                </div>
              )
            })}
            {(hours as { notes?: string }).notes && (
              <p className="text-xs text-gray-400 pt-2">{(hours as { notes?: string }).notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">{t('resourceDetail.contact')}</h2>
        <div className="space-y-2">
          {resource.phone && (
            <a href={`tel:${resource.phone}`} className="flex items-center gap-2.5 text-sm text-primary-600 font-medium hover:underline">
              <Phone size={15} /> {resource.phone}
            </a>
          )}
          {resource.website && (
            <a
              href={resource.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-primary-600 font-medium hover:underline"
            >
              <Globe size={15} /> {resource.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {!hideAddress && (
            <div className="flex items-start gap-2.5 text-sm text-gray-600">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <span>
                {resource.address.street}, {resource.address.city}, {resource.address.state}{' '}
                {(resource.address as { zip?: string }).zip}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Get There — the transportation layer. Placed directly after Contact
          because "where is it" and "how do I reach it" are the same question
          for someone without a car. */}
      <HousingEligibility resource={resource} />
      <GetThere resource={resource} />

      {/* Tags — internal `key:value` bookkeeping (import:, access_src:, ride:, …)
          is filtered out by publicTags(); those entries are how the pipeline and
          the Ride Assistance Finder read a listing, not something a visitor
          gains anything from seeing. */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <span key={tag} className="badge bg-gray-100 text-gray-600">{tag}</span>
          ))}
        </div>
      )}

      {/* Claim prompt — the highest-intent place to catch someone who works
          at this organization, since they are far likelier to land on their
          own listing than on the provider pitch page. Only shown while the
          owning provider is genuinely unclaimed. */}
      {owner?.claim_status === 'unclaimed' && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
          <p className="text-sm text-gray-700">
            <strong>{t('resourceDetail.claimQuestion').replace('{org}', owner.organization_name)}</strong>{' '}
            {t('resourceDetail.claimBody')}
          </p>
          <Link
            to={`/claim/${owner.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline mt-2"
          >
            {t('resourceDetail.claimThisListing')} <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Sticky CTA (mobile) */}
      <div className="fixed bottom-16 md:hidden inset-x-4 z-30">
        <Link to={`/book/${resource.id}`} className="btn-primary w-full btn-lg shadow-lg">
          {resource.category === 'shelter' ? t('booking.requestSpot') : t('booking.requestHelp')}
        </Link>
      </div>
    </div>
  )
}
