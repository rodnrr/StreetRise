import { Link } from 'react-router-dom'
import { Navigation, HelpCircle } from 'lucide-react'
import clsx from 'clsx'
import {
  TRAVEL_MODES,
  canRouteTo,
  googleMapsDirectionsUrl,
  appleMapsDirectionsUrl,
  prefersAppleMaps,
} from '@/lib/transport'
import { useMapStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import type { Resource } from '@/types'

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
    <div className={compact ? 'space-y-2' : 'card'}>
      <h2
        className={clsx(
          'flex items-center gap-2 font-semibold text-gray-900',
          compact ? 'text-sm' : 'mb-3',
        )}
      >
        <Navigation size={compact ? 14 : 16} className="text-gray-400" />
        {t('getThere.title')}
      </h2>

      {routable ? (
        <>
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
          compact ? 'text-xs' : 'mt-3 text-sm',
        )}
      >
        <HelpCircle size={compact ? 13 : 15} /> {t('getThere.needHelpGettingThere')}
      </Link>
    </div>
  )
}
