import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Phone, Globe, MapPin, Clock, BedDouble, ChevronLeft, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { db } from '@/lib/supabase'
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
      <span className="badge-verified shrink-0 flex items-center gap-1">
        <CheckCircle size={12} /> Staff Verified
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
        <Clock size={12} /> Community Listed
      </span>
    )
  }
  return null
}

function TrustAlert({ resource }: { resource: Resource }) {
  const { label, level } = getTrustInfo(resource)
  if (level === 'fresh' || level === 'recent') return null
  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-3 mb-4 ${TRUST_LEVEL_CLASSES[level]}`}>
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <p className="text-sm font-medium">{label} — confirm details before visiting.</p>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  available: 'badge-available',
  limited:   'badge-limited',
  full:      'badge-full',
  unknown:   'badge-unknown',
  closed:    'badge-unknown',
}

function getAvailabilityLabel(resource: Resource): string {
  if (resource.category === 'shelter') {
    const labels: Record<string, string> = { available: 'Beds Available', limited: 'Limited Beds', full: 'Shelter Full', unknown: 'Availability Unknown', closed: 'Closed' }
    return labels[resource.availability_status] ?? 'Availability Unknown'
  }
  const labels: Record<string, string> = { available: 'Open Now', limited: 'Limited Availability', full: 'Unavailable', unknown: 'Availability Unknown', closed: 'Closed' }
  return labels[resource.availability_status] ?? 'Availability Unknown'
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: resource, isLoading } = useQuery<Resource | null>({
    queryKey: ['resource', id],
    queryFn:  async () => {
      // `id` and `claim_status` on the joined provider drive the "claim this
      // listing" prompt below. Unclaimed providers are publicly readable
      // (providers_unclaimed_read), so this join works for anonymous visitors.
      const { data } = await db.resources()
        .select('*, providers(id, organization_name, website, claim_status)')
        .eq('id', id!)
        .single()
      return data as unknown as Resource
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

  if (!resource) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
        <p className="text-gray-500">Resource not found.</p>
        <Link to="/map" className="btn-primary mt-4">Back to Map</Link>
      </div>
    )
  }

  const hours      = resource.hours_of_operation as Record<string, { open: string; close: string; closed: boolean } | undefined>
  const showBeds   = resource.category === 'shelter' && resource.beds_total != null
  const emoji      = CATEGORY_EMOJI[resource.category] ?? '📍'

  // Confidential address logic (DV shelters, etc.)
  const isConfidential = resource.access_type === 'confidential_address' || resource.access_type === 'phone_intake'
  const isDVResource   = resource.population_focus?.includes('domestic_violence')
  const hideAddress    = isDVResource && isConfidential

  // Facility items
  const facilities: { show: boolean; label: string }[] = [
    { show: resource.has_showers,               label: '🚿 Showers available' },
    { show: resource.has_restrooms,             label: '🚻 Restrooms available' },
    { show: resource.serves_meals,              label: '🍽️ Meals served' },
    { show: resource.has_laundry,               label: '🫧 Laundry available' },
    { show: resource.pet_friendly,              label: '🐾 Pets welcome' },
    { show: resource.wheelchair_accessible,     label: '♿ Wheelchair accessible' },
    { show: resource.public_transit_accessible, label: '🚌 Near public transit' },
    { show: resource.overnight_allowed === true,label: '🌙 Overnight stays allowed' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 md:pb-8 space-y-5">
      {/* Back */}
      <Link to="/map" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to map
      </Link>

      {/* Trust alert (aging/stale resources) */}
      <TrustAlert resource={resource} />

      {/* Hero */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className={`${STATUS_COLOR[resource.availability_status]} mb-2 inline-flex`}>
              {getAvailabilityLabel(resource)}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              {emoji} {resource.name}
            </h1>
            {hideAddress ? (
              <p className="text-sm text-gray-500 mt-1">📞 Contact for location and intake process</p>
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
                {RESOURCE_TYPE_LABEL[resource.resource_type] ?? resource.resource_type}
              </span>
            )}
            {resource.population_focus?.map((tag) => (
              <span key={tag} className="badge bg-purple-50 text-purple-700">
                {POPULATION_FOCUS_LABEL[tag] ?? tag}
              </span>
            ))}
          </div>
        )}

        {/* Gender policy */}
        {resource.gender_policy && resource.gender_policy !== 'unknown' && (
          <p className="text-sm text-gray-600 mb-3">
            👤 {GENDER_POLICY_LABEL[resource.gender_policy] ?? resource.gender_policy}
          </p>
        )}

        <p className="text-gray-700 text-sm leading-relaxed">{resource.description}</p>

        {/* Bed count */}
        {showBeds && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
            <BedDouble size={18} className="text-gray-500" />
            <div>
              <p className="font-semibold text-gray-900">
                {resource.beds_available ?? '?'}{' '}
                <span className="text-gray-400 font-normal">/ {resource.beds_total} beds available</span>
              </p>
              {resource.beds_updated_at && (
                <p className="text-xs text-gray-400">
                  Updated {new Date(resource.beds_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex gap-3">
          <Link to={`/book/${resource.id}`} className="btn-primary flex-1">
            {resource.category === 'shelter' ? 'Request a Spot' : 'Request Help'}
          </Link>
          {resource.phone && (
            <a href={`tel:${resource.phone}`} className="btn-secondary flex-1 text-center">
              Call
            </a>
          )}
        </div>
      </div>

      {/* Intake requirements */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Intake Requirements</h2>
        <div className="space-y-2">
          {(
            [
              [resource.walk_ins_accepted,              'Walk-ins accepted',   'No walk-ins — call ahead'],
              [!resource.requires_id,                   'No ID required',      'ID required to enter'],
              [!resource.requires_referral,             'No referral needed',  'Referral required'],
              [!resource.phone_required_before_arrival, 'No need to call first','Call before visiting'],
            ] as [boolean, string, string][]
          ).map(([ok, yes, no]) => (
            <div key={yes} className="flex items-center gap-2.5 text-sm">
              {ok
                ? <CheckCircle size={16} className="text-success-600 shrink-0" />
                : <XCircle     size={16} className="text-danger-500 shrink-0"  />}
              <span className={ok ? 'text-gray-700' : 'text-gray-500'}>{ok ? yes : no}</span>
            </div>
          ))}
          {resource.age_min != null && (
            <p className="text-sm text-gray-600">🎂 Ages {resource.age_min}{resource.age_max ? `–${resource.age_max}` : '+'}</p>
          )}
          {resource.languages_spoken?.length > 0 && (
            <p className="text-sm text-gray-600">🗣 Languages: {resource.languages_spoken.join(', ')}</p>
          )}
        </div>
      </div>

      {/* Facilities */}
      {facilities.some((f) => f.show) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Facilities & Amenities</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {facilities
              .filter((f) => f.show)
              .map(({ label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={14} className="text-success-600 shrink-0" />
                  {label}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Hours */}
      {Object.keys(hours).some((d) => hours[d as keyof typeof hours]) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock size={16} /> Hours of Operation
          </h2>
          <div className="space-y-1">
            {DAYS.map((day) => {
              const h = hours[day]
              return (
                <div key={day} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600 capitalize">{day}</span>
                  <span className={h?.closed ? 'text-gray-400' : 'text-gray-900 font-medium'}>
                    {h?.closed ? 'Closed' : h ? `${h.open} – ${h.close}` : '—'}
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
        <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
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

      {/* Tags */}
      {resource.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resource.tags.map((t) => (
            <span key={t} className="badge bg-gray-100 text-gray-600">{t}</span>
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
            <strong>Do you work at {owner.organization_name}?</strong> This listing was
            built from public information. Claim it to keep the hours, availability,
            and contact details accurate.
          </p>
          <Link
            to={`/claim/${owner.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline mt-2"
          >
            Claim this listing <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Sticky CTA (mobile) */}
      <div className="fixed bottom-16 md:hidden inset-x-4 z-30">
        <Link to={`/book/${resource.id}`} className="btn-primary w-full btn-lg shadow-lg">
          {resource.category === 'shelter' ? 'Request a Spot' : 'Request Help'}
        </Link>
      </div>
    </div>
  )
}
