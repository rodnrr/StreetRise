import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Phone, Globe, MapPin, Clock, Users, BedDouble, ChevronLeft, CheckCircle, XCircle } from 'lucide-react'
import { db } from '@/lib/supabase'
import type { Resource } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  available: 'badge-available',
  limited:   'badge-limited',
  full:      'badge-full',
  unknown:   'badge-unknown',
  closed:    'badge-unknown',
}

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: resource, isLoading } = useQuery<Resource | null>({
    queryKey: ['resource', id],
    queryFn: async () => {
      const { data } = await db.resources().select('*, providers(organization_name, website)').eq('id', id!).single()
      return data as Resource
    },
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className={`skeleton ${i === 1 ? 'h-48' : 'h-28'} w-full`} />)}
    </div>
  )

  if (!resource) return (
    <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
      <p className="text-gray-500">Resource not found.</p>
      <Link to="/map" className="btn-primary mt-4">Back to Map</Link>
    </div>
  )

  const hours = resource.hours_of_operation as Record<string, { open: string; close: string; closed: boolean } | undefined>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 md:pb-8 space-y-5">
      {/* Back */}
      <Link to="/map" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to map
      </Link>

      {/* Hero */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className={`${STATUS_COLOR[resource.availability_status]} mb-2 inline-flex`}>
              {resource.availability_status.charAt(0).toUpperCase() + resource.availability_status.slice(1)}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{resource.name}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin size={13} /> {resource.address.street}, {resource.address.city}, {resource.address.state}
            </p>
          </div>
          {resource.verification_status === 'verified' && (
            <span className="badge-verified shrink-0 flex items-center gap-1">
              <CheckCircle size={12} /> Verified
            </span>
          )}
        </div>

        <p className="text-gray-700 text-sm leading-relaxed">{resource.description}</p>

        {/* Bed availability */}
        {resource.beds_total != null && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
            <BedDouble size={18} className="text-gray-500" />
            <div>
              <p className="font-semibold text-gray-900">
                {resource.beds_available ?? '?'} <span className="text-gray-400 font-normal">/ {resource.beds_total} beds available</span>
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
          <Link to={`/book/${resource.id}`} className="btn-primary flex-1">Request a Spot</Link>
          {resource.phone && (
            <a href={`tel:${resource.phone}`} className="btn-secondary flex-1 text-center">Call</a>
          )}
        </div>
      </div>

      {/* Intake rules */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Intake Requirements</h2>
        <div className="space-y-2">
          {([
            [resource.walk_ins_accepted,   'Walk-ins accepted',      'No walk-ins'],
            [!resource.requires_id,        'No ID required',         'ID required to enter'],
            [!resource.requires_referral,  'No referral needed',     'Referral required'],
          ] as [boolean, string, string][]).map(([ok, yes, no]) => (
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
          {resource.gender_restriction && resource.gender_restriction !== 'any' && (
            <p className="text-sm text-gray-600 capitalize">👤 {resource.gender_restriction} only</p>
          )}
          {resource.languages_spoken?.length > 0 && (
            <p className="text-sm text-gray-600">🗣 Languages: {resource.languages_spoken.join(', ')}</p>
          )}
        </div>
      </div>

      {/* Hours */}
      {Object.keys(hours).some(d => hours[d as keyof typeof hours]) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock size={16} /> Hours of Operation
          </h2>
          <div className="space-y-1">
            {DAYS.map(day => {
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
            <a href={resource.website} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2.5 text-sm text-primary-600 font-medium hover:underline">
              <Globe size={15} /> {resource.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <div className="flex items-start gap-2.5 text-sm text-gray-600">
            <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{resource.address.street}, {resource.address.city}, {resource.address.state} {(resource.address as {zip?:string}).zip}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {resource.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resource.tags.map(t => (
            <span key={t} className="badge bg-gray-100 text-gray-600">{t}</span>
          ))}
        </div>
      )}

      {/* Sticky book button (mobile) */}
      <div className="fixed bottom-16 md:hidden inset-x-4 z-30">
        <Link to={`/book/${resource.id}`} className="btn-primary w-full btn-lg shadow-lg">
          Request a Spot
        </Link>
      </div>
    </div>
  )
}
