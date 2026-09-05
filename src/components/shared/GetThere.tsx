import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Navigation, HelpCircle, TramFront, CarFront, ChevronRight } from 'lucide-react'
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

function NearestStop({ resource, compact }: { resource: Resource; compact: boolean }) {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: ['nearest-stop', resource.id, resource.lat, resource.lng, resource.address?.city],
    staleTime: 1000 * 60 * 60,
    enabled: resource.lat != null && resource.lng != null,
    queryFn: () => lookupNearestStop(
      { lat: resource.lat!, lng: resource.lng! },
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
      {data.fareFreeRoutes.length > 0 && (
        <p className="mt-1 pl-5 font-semibold">
          {t('transit.fareFree').replace('{routes}', data.fareFreeRoutes.join(', '))}
        </p>
      )}
    </div>
  )
}

interface Props {
  resource: Resource
  variant?: 'card' | 'compact'
}

/**
 * Contextual transportation entry point for a resource.
 *
 * Ordinary directions are visually grouped as one task. Ride assistance and
 * accessible transportation are a second task, so they no longer compete as
 * six equal-weight tiles. Confidential/non-walk-in destinations preserve the
 * existing safety gate and never receive map links or a carried destination.
 */
export default function GetThere({ resource, variant = 'card' }: Props) {
  const { t } = useI18n()
  const userLocation = useMapStore((s) => s.userLocation)
  const routable = canRouteTo(resource)
  const compact = variant === 'compact'

  const rideHref = routable ? `/transportation?to=${resource.id}` : '/transportation'
  const accessibleHref = routable
    ? `/transportation?to=${resource.id}&mode=wheelchair`
    : '/transportation?mode=wheelchair'

  return (
    <div className={compact ? 'space-y-3' : 'card space-y-4'}>
      <div className="flex items-center gap-2">
        <span className={clsx('flex items-center justify-center rounded-xl bg-gray-100 text-gray-600', compact ? 'h-8 w-8' : 'h-10 w-10')}>
          <Navigation size={compact ? 15 : 18} aria-hidden="true" />
        </span>
        <h2 className={clsx('font-bold text-gray-900', compact ? 'text-sm' : 'text-base')}>
          {t('getThere.title')}
        </h2>
      </div>

      {routable ? (
        <>
          <NearestStop resource={resource} compact={compact} />

          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-4 gap-2">
              {TRAVEL_MODES.map((mode) => {
                const href = googleMapsDirectionsUrl(resource, mode.mode, userLocation)
                if (!href) return null
                return (
                  <a
                    key={mode.mode}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={clsx(
                      'flex min-h-11 flex-col items-center justify-center rounded-xl bg-gray-50 px-1 font-semibold text-gray-800 transition hover:bg-gray-100 active:scale-[0.98]',
                      compact ? 'gap-0.5 text-[11px]' : 'gap-1 text-xs',
                    )}
                  >
                    <span className={compact ? 'text-base' : 'text-lg'} aria-hidden>{mode.icon}</span>
                    {t(mode.labelKey)}
                  </a>
                )
              })}
            </div>

            {prefersAppleMaps() && (
              <p className={clsx('text-gray-400', compact ? 'mt-2 text-[10px]' : 'mt-3 text-xs')}>
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
          </div>
        </>
      ) : (
        <p className={clsx('rounded-xl bg-amber-50 px-3 py-2 text-amber-900', compact ? 'text-xs' : 'text-sm')}>
          {t('getThere.callForLocation')}
        </p>
      )}

      <div className={clsx('rounded-2xl border border-primary-100 bg-primary-50', compact ? 'p-3' : 'p-4')}>
        <Link
          to={rideHref}
          className="flex min-h-11 items-center gap-3 rounded-xl text-left text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className={clsx('flex shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm', compact ? 'h-9 w-9' : 'h-11 w-11')}>
            <HelpCircle size={compact ? 17 : 20} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={clsx('block font-bold', compact ? 'text-xs' : 'text-sm')}>
              {t('getThere.needHelpGettingThere')}
            </span>
            <span className={clsx('mt-0.5 block text-primary-700', compact ? 'text-[10px]' : 'text-xs')}>
              {t('getThere.mode.rideAssistance')}
            </span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-primary-500" aria-hidden="true" />
        </Link>

        <div className="mt-2 border-t border-primary-100 pt-2">
          <Link
            to={accessibleHref}
            className={clsx(
              'inline-flex min-h-10 items-center gap-2 font-semibold text-primary-700 hover:text-primary-800',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            <span aria-hidden>♿</span> {t('getThere.mode.accessible')}
          </Link>
        </div>
      </div>
    </div>
  )
}
