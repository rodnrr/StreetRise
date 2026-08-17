import { ChevronRight, MapPin, Phone } from 'lucide-react'
import clsx from 'clsx'
import {
  CATEGORY_EMOJI,
  RESOURCE_TYPE_LABEL,
  getTrustInfo,
} from '@/lib/mapFilters'
import { formatDistance } from '@/lib/geo'
import type { Resource } from '@/types'

const STATUS_DOT: Record<string, string> = {
  available: 'bg-available',
  limited:   'bg-limited',
  full:      'bg-full',
  closed:    'bg-gray-400',
  unknown:   'bg-unknown',
}

const STATUS_TEXT: Record<string, string> = {
  available: 'text-success-600',
  limited:   'text-warning-600',
  full:      'text-danger-600',
  closed:    'text-gray-500',
  unknown:   'text-gray-400',
}

function statusLabel(r: Resource) {
  const shelter = r.category === 'shelter'
  const labels: Record<string, string> = shelter
    ? { available: 'Beds available', limited: 'Limited beds', full: 'Full', unknown: 'Call to check', closed: 'Closed' }
    : { available: 'Open now', limited: 'Limited', full: 'Unavailable', unknown: 'Call to check', closed: 'Closed' }
  return labels[r.availability_status] ?? 'Call to check'
}

interface Props {
  resource: Resource
  distanceKm: number | null
  isSelected?: boolean
  onClick: () => void
}

/**
 * One row in the results list. Tapping it opens the same detail sheet a map
 * pin opens — the list and the map are two views of one selection, not two
 * separate modes.
 */
export default function ResourceCard({ resource: r, distanceKm, isSelected, onClick }: Props) {
  const trust = getTrustInfo(r)

  return (
    <button
      onClick={onClick}
      aria-current={isSelected || undefined}
      className={clsx(
        'w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors',
        isSelected ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-gray-50',
      )}
    >
      <span className="text-xl leading-none mt-0.5 shrink-0" aria-hidden>
        {CATEGORY_EMOJI[r.category] ?? '📍'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{r.name}</p>

        <p className="text-xs text-gray-500 truncate mt-0.5">
          {r.resource_type ? `${RESOURCE_TYPE_LABEL[r.resource_type] ?? r.resource_type} · ` : ''}
          {r.address?.city}
          {distanceKm != null && ` · ${formatDistance(distanceKm)}`}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
          <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', STATUS_TEXT[r.availability_status])}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_DOT[r.availability_status])} />
            {statusLabel(r)}
          </span>

          {r.walk_ins_accepted && (
            <span className="text-xs text-gray-500">Walk-ins OK</span>
          )}
          {r.phone && (
            <span className="text-xs text-gray-400 inline-flex items-center gap-0.5">
              <Phone size={10} /> Phone
            </span>
          )}
          {trust.level === 'stale' && (
            <span className="text-xs text-red-600">Call first</span>
          )}
          {(r.access_type === 'confidential_address' || r.access_type === 'phone_intake') && (
            <span className="text-xs text-gray-400 inline-flex items-center gap-0.5">
              <MapPin size={10} /> Call for location
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
    </button>
  )
}
