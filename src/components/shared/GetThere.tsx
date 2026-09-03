import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Navigation, HelpCircle, TramFront, CarFront } from 'lucide-react'
import clsx from 'clsx'
import {
  TRAVEL_MODES,
  canRouteTo,
  googleMapsDirectionsUrl,
  appleMapsDirectionsUrl,
  prefersAppleMaps,
} from '@/lib/transport'
import {
  lookupNearestStop, formatWalkDistance, serviceDaysKey, AGENCY_LABEL,
} from '@/lib/transit'
import { useMapStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import type { Resource } from '@/types'

/**
 * The nearest-stop line.
 *
 * Renders one of exactly three things, and nothing is a bigger part of the
 * design than the cases where it renders nothing at all: an expired feed or an
 * address outside the agency data we hold both produce silence, never a guess.
 * See src/lib/transit.ts.
 */
function NearestStop({ resource, compact }: { resource: Resource; compact: boolean }) {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: ['nearest-stop', resource.id],
    // Stop locations change on service-change dates, not by the minute.
    staleTime: 1000 * 60 * 60,
    enabled: resource.lat != null && resource.lng != null,
    queryFn: () => lookupNearestStop(
      { lat: resource.lat!, lng: resource.lng! },
      // The city decides whether we hold a feed for this county at all, and
      // therefore whether an absence of stops means anything. See coverageFor().
      { city: resource.address?.city },
    ),
  })

  if (!data || data.kind === 'no_coverage' || data.kind === 'stale_feed') return null

  const agency = AGENCY_LABEL[data.stop.agency] ?? data.stop.agency
  const text = compact ? 'text-xs' : 'text-sm'

  if (data.kind === 'distant') {
    return (
      <p className={clsx('flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800', text)}>
        <CarFront size={compact ? 13 : 15} className="mt-0.5 shrink-0" />
        <span>
          {t('transit.distant')
            .replace('{agency}', agency)
            .replace('{distance}', formatWalkDistance(data.km))}
        </span>
      </p>
    )
  }

  const daysKey = serviceDaysKey(data.stop)
  return (
    <div className={clsx('rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900', text)}>
      <p className="flex items-start gap-2">
        <TramFront size={compact ? 13 : 15} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">
            {t('transit.nearestStop').replace('{distance}', formatWalkDistance(data.km))}
          </span>{' '}
          <span lang="en">{data.stop.stop_name}</span>
        </span>
      </p>
      <p className="mt-1 pl-5 text-emerald-800/90">
        {data.stop.route_short_names.length > 0 && (
          <>{t('transit.routes').replace('{routes}', data.stop.route_short_names.join(', '))}</>
        )}
        {daysKey && <> · {t(daysKey)}</>}
        {data.stop.weekday_first && data.stop.weekday_last && (
          <> · {t('transit.firstLast')
            .replace('{first}', data.stop.weekday_first)
            .replace('{last}', data.stop.weekday_last)}</>
        )}
      </p>
      {/* HART's own fare data prices the streetcar and SkyConnect at $0.00.
          Free transport matters more here than anywhere else on the page. */}
      {data.fareFreeRoutes.length > 0 && (
        <p className="mt-1 pl-5 font-semibold">
          {t('transit.fareFree').replace('{routes}', data.fareFreeRoutes.join(', '))}
        </p>
      )}
    </div>
  )
}

/**
 * "Get There" — the transportation layer's entry point on a single listing.
 *
 * Four of the six tiles hand the trip straight to the visitor's map app with
 * the destination filled in. The other two — ride assistance and accessible
 * transportation — open the Ride Assistance Finder, because "how do I get
 * there" and "who will help me pay for or provide the trip" are different
 * questions and only the second one needs StreetRise.
 *
 * When the listing cannot honestly be routed to — a confidential address, or a
 * phone-intake listing whose stored address is an office rather than the place
 * the service is delivered — no map links are offered and no destination is
 * carried into the finder. The transportation directory is still linked,
 * because needing a ride is true whether or not we can publish the address.
 */

interface Props {
  resource: Resource
  /** 'card' for the detail page, 'compact' for the map sheet. */
  variant?: 'card' | 'compact'
}

export default function GetThere({ resource, variant = 'card' }: Props) {
  const { t } = useI18n()
  const userLocation = useMapStore((s) => s.userLocation)
  const routable = canRouteTo(resource)

  const rideHref = routable ? `/transportation?to=${resource.id}` : '/transportation'
  const accessibleHref = routable
    ? `/transportation?to=${resource.id}&mode=wheelchair`
    : '/transportation?mode=wheelchair'

  const compact = variant === 'compact'

  const tileClass = clsx(
    'flex items-center justify-center gap-1.5 rounded-xl font-semibold text-center',
    'transition-colors active:scale-[0.98] select-none',
    'bg-gray-100 text-gray-800 hover:bg-gray-200',
    compact ? 'px-2 py-2 text-xs' : 'px-3 py-3 text-sm',
  )
  const helpTileClass = clsx(
    'flex items-center justify-center gap-1.5 rounded-xl font-semibold text-center',
    'transition-colors active:scale-[0.98] select-none',
    'bg-primary-50 text-primary-700 hover:bg-primary-100',
    compact ? 'px-2 py-2 text-xs' : 'px-3 py-3 text-sm',
  )

  return (
    <div className={compact ? 'space-y-2' : 'card space-y-3'}>
      <h2
        className={clsx(
          'flex items-center gap-2 font-semibold text-gray-900',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        <Navigation size={compact ? 14 : 16} className="text-gray-400" />
        {t('getThere.title')}
      </h2>

      {routable ? (
        <>
          {/* Gated on `routable` for the same reason the map links are, and it
              matters more here: naming the nearest cross street to a
              confidential-address shelter would leak the location the rest of
              this component is careful not to publish. */}
          <NearestStop resource={resource} compact={compact} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TRAVEL_MODES.map((m) => {
              const href = googleMapsDirectionsUrl(resource, m.mode, userLocation)
              if (!href) return null
              return (
                <a
                  key={m.mode}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={tileClass}
                >
                  <span aria-hidden>{m.icon}</span> {t(m.labelKey)}
                </a>
              )
            })}
            <Link to={rideHref} className={helpTileClass}>
              <span aria-hidden>🚕</span> {t('getThere.mode.rideAssistance')}
            </Link>
            <Link to={accessibleHref} className={helpTileClass}>
              <span aria-hidden>♿</span> {t('getThere.mode.accessible')}
            </Link>
          </div>

          {/* Offered only where it is likely to be the default map app. Getting
              the guess wrong costs one unused link, never a missing one. */}
          {prefersAppleMaps() && (
            <p className={clsx('text-gray-400', compact ? 'text-[11px]' : 'mt-3 text-xs')}>
              <a
                href={appleMapsDirectionsUrl(resource, 'transit', userLocation) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600"
              >
                {t('getThere.openInAppleMaps')}
              </a>
            </p>
          )}
        </>
      ) : (
        // No address we can honestly route to. The need for a ride is real
        // either way, so the directory stays reachable — without a destination.
        <p className={clsx('text-gray-600', compact ? 'text-xs' : 'text-sm')}>
          {t('getThere.callForLocation')}
        </p>
      )}

      <Link
        to={rideHref}
        className={clsx(
          'inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        <HelpCircle size={compact ? 13 : 15} /> {t('getThere.needHelpGettingThere')}
      </Link>
    </div>
  )
}
