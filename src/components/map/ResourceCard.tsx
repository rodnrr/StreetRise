import { Link } from 'react-router-dom'
import { Phone, Globe, MapPin, Users, X, ChevronRight, CheckCircle, Clock, Navigation } from 'lucide-react'
import clsx from 'clsx'
import {
  CATEGORY_EMOJI,
  RESOURCE_TYPE_LABEL,
  GENDER_POLICY_LABEL,
  POPULATION_FOCUS_LABEL,
  getTrustInfo,
  TRUST_LEVEL_CLASSES,
} from '@/lib/mapFilters'
import type { Resource } from '@/types'

function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
        <CheckCircle size={11} /> Staff Verified
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
        <Clock size={11} /> Community Listed
      </span>
    )
  }
  return null
}

function TrustBadge({ resource }: { resource: Resource }) {
  const { label, level } = getTrustInfo(resource)
  return (
    <span className={clsx('inline-flex items-center text-xs rounded-full px-2 py-0.5', TRUST_LEVEL_CLASSES[level])}>
      {label}
    </span>
  )
}

const STATUS_BADGE: Record<string, string> = {
  available: 'badge-available',
  limited:   'badge-limited',
  full:      'badge-full',
  unknown:   'badge-unknown',
  closed:    'badge-unknown',
}

function getAvailabilityLabel(resource: Resource) {
  const isShelter = resource.category === 'shelter'

  if (isShelter) {
    const labels: Record<string, string> = { available: 'Beds Available', limited: 'Limited Beds', full: 'Shelter Full', unknown: 'Availability Unknown', closed: 'Closed' }
    return labels[resource.availability_status] ?? 'Availability Unknown'
  }

  const labels: Record<string, string> = { available: 'Open Now', limited: 'Limited Availability', full: 'Unavailable', unknown: 'Availability Unknown', closed: 'Closed' }
  return labels[resource.availability_status] ?? 'Availability Unknown'
}

function buildDirectionsUrl(resource: Resource) {
  if (resource.lat != null && resource.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lng}`
  }
  const dest = [resource.address.street, resource.address.city, resource.address.state, resource.address.zip]
    .filter(Boolean)
    .join(', ')
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` : null
}

// Facility icons shown as a compact row
function FacilityRow({ resource }: { resource: Resource }) {
  const items: { show: boolean; icon: string; label: string }[] = [
    { show: resource.has_showers,              icon: '🚿', label: 'Showers' },
    { show: resource.has_restrooms,            icon: '🚻', label: 'Restrooms' },
    { show: resource.serves_meals,             icon: '🍽️', label: 'Meals' },
    { show: resource.has_laundry,              icon: '🫧',  label: 'Laundry' },
    { show: resource.pet_friendly,             icon: '🐾', label: 'Pets OK' },
    { show: resource.wheelchair_accessible,    icon: '♿', label: 'Accessible' },
    { show: resource.public_transit_accessible,icon: '🚌', label: 'Near transit' },
    { show: resource.overnight_allowed === true,icon: '🌙', label: 'Overnight' },
  ]
  const visible = items.filter((i) => i.show)
  if (!visible.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visible.map(({ icon, label }) => (
        <span key={label} className="badge bg-gray-50 text-gray-600 text-xs gap-1">
          {icon} {label}
        </span>
      ))}
    </div>
  )
}

interface Props {
  resource: Resource
  compact?: boolean
  onClose?: () => void
  onClick?: () => void
}

export default function ResourceCard({ resource, compact, onClose, onClick }: Props) {
  const r = resource
  const availabilityLabel = getAvailabilityLabel(r)
  const showBedCount  = r.category === 'shelter' && r.beds_total != null
  const directionsUrl = buildDirectionsUrl(r)
  const emoji         = CATEGORY_EMOJI[r.category] ?? '📍'

  // Compact list row
  if (compact) {
    return (
      <button onClick={onClick} className="w-full card-hover text-left flex items-center gap-3">
        <div
          className={clsx('w-2 h-10 rounded-full shrink-0', {
            'bg-available': r.availability_status === 'available',
            'bg-limited':   r.availability_status === 'limited',
            'bg-full':      r.availability_status === 'full',
            'bg-unknown':   !['available', 'limited', 'full'].includes(r.availability_status),
          })}
        />
        <span className="text-base leading-none shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{r.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {r.resource_type ? (RESOURCE_TYPE_LABEL[r.resource_type] ?? r.resource_type) + ' · ' : ''}
            {r.address.city}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={STATUS_BADGE[r.availability_status]}>{availabilityLabel}</span>
          <TrustBadge resource={r} />
        </div>
        <ChevronRight size={16} className="text-gray-400 shrink-0" />
      </button>
    )
  }

  // Full card (selected state, floated above map)
  const isConfidential = r.access_type === 'confidential_address' || r.access_type === 'phone_intake'
  const isDVResource   = r.population_focus?.includes('domestic_violence')

  return (
    <div className="card shadow-map">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={STATUS_BADGE[r.availability_status]}>{availabilityLabel}</span>
            <VerificationBadge status={r.verification_status} />
          </div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">
            {emoji} {r.name}
          </h3>
          {/* Suppress address for confidential DV resources */}
          {isDVResource && isConfidential ? (
            <p className="text-xs text-gray-500 mt-0.5">📞 Call for location and intake</p>
          ) : (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin size={11} />
              {r.address.street}, {r.address.city}
            </p>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-icon shrink-0 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Resource type + population focus */}
      {(r.resource_type || (r.population_focus && r.population_focus.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {r.resource_type && (
            <span className="badge bg-blue-50 text-blue-700">
              {RESOURCE_TYPE_LABEL[r.resource_type] ?? r.resource_type}
            </span>
          )}
          {r.population_focus?.slice(0, 3).map((tag) => (
            <span key={tag} className="badge bg-purple-50 text-purple-700">
              {POPULATION_FOCUS_LABEL[tag] ?? tag}
            </span>
          ))}
        </div>
      )}

      {/* Gender policy (only show non-generic values) */}
      {r.gender_policy && r.gender_policy !== 'unknown' && r.gender_policy !== 'gender_inclusive' && (
        <p className="text-xs text-gray-600 mb-2">
          👤 {GENDER_POLICY_LABEL[r.gender_policy] ?? r.gender_policy}
        </p>
      )}

      {/* Bed count (shelters) */}
      {showBedCount && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-2">
          <Users size={15} className="text-gray-500" />
          <span className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">{r.beds_available ?? '?'}</span>
            &nbsp;of&nbsp;
            <span className="font-bold">{r.beds_total}</span> beds available
          </span>
          {r.beds_updated_at && (
            <span className="text-xs text-gray-400 ml-auto">
              Updated {new Date(r.beds_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Quick access badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {r.walk_ins_accepted && (
          <span className="badge bg-green-50 text-green-700">Walk-ins OK</span>
        )}
        {!r.requires_id && (
          <span className="badge bg-blue-50 text-blue-700">No ID</span>
        )}
        {r.phone_required_before_arrival && (
          <span className="badge bg-amber-50 text-amber-700">Call first</span>
        )}
      </div>

      {/* Facility row */}
      <FacilityRow resource={r} />

      {/* Trust label */}
      <div className="mt-2 mb-3">
        <TrustBadge resource={r} />
      </div>

      {/* Contact + CTA */}
      {r.phone && (
        <a
          href={`tel:${r.phone}`}
          className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline mb-3"
        >
          <Phone size={14} /> {r.phone}
        </a>
      )}
      {r.website && (
        <a
          href={r.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3"
        >
          <Globe size={12} /> Website
        </a>
      )}

      <div className="flex gap-2">
        <Link to={`/resources/${r.id}`} className="btn-primary flex-1 text-sm py-2.5">
          View Details
        </Link>
        {directionsUrl && !isConfidential && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm py-2.5 px-4 flex items-center gap-1.5"
            aria-label="Get directions"
          >
            <Navigation size={14} />
            Directions
          </a>
        )}
      </div>
    </div>
  )
}
