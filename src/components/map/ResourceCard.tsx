import { Link } from 'react-router-dom'
import { Phone, Globe, MapPin, Users, X, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { Resource } from '@/types'

function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
        <CheckCircle size={11} /> Verified
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

const STATUS_LABEL: Record<string, string> = {
  available: 'Beds Available',
  limited:   'Limited Availability',
  full:      'No Beds Available',
  unknown:   'Availability Unknown',
  closed:    'Closed',
}

const STATUS_BADGE: Record<string, string> = {
  available: 'badge-available',
  limited:   'badge-limited',
  full:      'badge-full',
  unknown:   'badge-unknown',
  closed:    'badge-unknown',
}

interface Props {
  resource:  Resource
  compact?:  boolean
  onClose?:  () => void
  onClick?:  () => void
}

export default function ResourceCard({ resource, compact, onClose, onClick }: Props) {
  const r = resource

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full card-hover text-left flex items-center gap-3"
      >
        <div className={clsx('w-2 h-10 rounded-full shrink-0', {
          'bg-available': r.availability_status === 'available',
          'bg-limited':   r.availability_status === 'limited',
          'bg-full':      r.availability_status === 'full',
          'bg-unknown':   !['available','limited','full'].includes(r.availability_status),
        })} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{r.name}</p>
          <p className="text-xs text-gray-500 truncate">{r.address.city}, {r.address.state}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={STATUS_BADGE[r.availability_status]}>{STATUS_LABEL[r.availability_status]}</span>
          <VerificationBadge status={r.verification_status} />
        </div>
        <ChevronRight size={16} className="text-gray-400 shrink-0" />
      </button>
    )
  }

  return (
    <div className="card shadow-map">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={STATUS_BADGE[r.availability_status]}>
              {STATUS_LABEL[r.availability_status]}
            </span>
            <VerificationBadge status={r.verification_status} />
          </div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">{r.name}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={11} />
            {r.address.street}, {r.address.city}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-icon shrink-0 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Bed count */}
      {r.beds_total != null && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-3">
          <Users size={16} className="text-gray-500" />
          <span className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">
              {r.beds_available ?? '?'}
            </span>
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

      {/* Quick info */}
      <div className="flex flex-wrap gap-2 mb-3">
        {r.walk_ins_accepted && (
          <span className="badge bg-green-50 text-green-700">Walk-ins OK</span>
        )}
        {!r.requires_id && (
          <span className="badge bg-blue-50 text-blue-700">No ID required</span>
        )}
        {r.gender_restriction && r.gender_restriction !== 'any' && (
          <span className="badge bg-purple-50 text-purple-700 capitalize">{r.gender_restriction} only</span>
        )}
      </div>

      {/* Contact row */}
      <div className="flex items-center gap-3 text-sm">
        {r.phone && (
          <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-primary-600 font-medium hover:underline">
            <Phone size={14} />
            {r.phone}
          </a>
        )}
        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
            <Globe size={13} />
            Website
          </a>
        )}
      </div>

      {/* CTA */}
      <div className="mt-3 flex gap-2">
        <Link
          to={`/book/${r.id}`}
          className="btn-primary flex-1 text-sm py-2.5"
        >
          Request a Spot
        </Link>
        <Link
          to={`/resources/${r.id}`}
          className="btn-secondary text-sm py-2.5 px-4"
        >
          Details
        </Link>
      </div>
    </div>
  )
}
