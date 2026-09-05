import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Phone, Mail, Users, MessageSquare, ChevronDown, Navigation } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { Booking, BookingStatus } from '@/types'

type TransportationDetails = {
  booking_id: string
  origin_text: string
  destination_text: string
  requested_trip_at?: string | null
  requested_time_window?: string | null
  requested_kind: string
  requested_modes: string[]
  wheelchair_required?: boolean | null
  mobility_notes?: string | null
}

type BookingWithResource = Booking & {
  resource?: { name: string; category?: string } | null
  transportation?: TransportationDetails | TransportationDetails[] | null
}

type ProviderUpdatePayload = {
  id: string
  status?: BookingStatus
  provider_notes?: string | null
  decision_note?: string | null
}

// Live booking_status does not contain `declined`. Keep queue actions on states
// proven to exist until the enum drift is deliberately reconciled.
const STATUSES: (BookingStatus | 'all')[] = ['all','pending','confirmed','needs_info','contacted','no_response','closed','completed']

const ACTIONS: { label: string; status: BookingStatus }[] = [
  { label: 'Confirm', status: 'confirmed' },
  { label: 'Needs Info', status: 'needs_info' },
  { label: 'Mark Contacted', status: 'contacted' },
  { label: 'No Response', status: 'no_response' },
  { label: 'Close', status: 'closed' },
  { label: 'Complete', status: 'completed' },
]

const STATUS_STYLE: Record<string, string> = {
  pending:     'badge-pending',
  confirmed:   'badge-verified',
  needs_info:  'badge bg-yellow-50 text-yellow-700',
  contacted:   'badge bg-blue-50 text-blue-700',
  no_response: 'badge bg-orange-50 text-orange-700',
  closed:      'badge bg-gray-100 text-gray-500',
  waitlisted:  'badge bg-orange-50 text-orange-700',
  cancelled:   'badge bg-gray-100 text-gray-500',
  completed:   'badge-available',
  no_show:     'badge bg-red-50 text-red-700',
}

function transportDetails(booking: BookingWithResource): TransportationDetails | null {
  const raw = booking.transportation
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function isTransportationRequest(booking: BookingWithResource): boolean {
  return booking.resource?.category === 'transportation'
    || !!transportDetails(booking)
    || booking.notes?.startsWith('[Transportation request]') === true
}

function isMissingTransportationRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST200' || error.code === '42P01' || /booking_transportation_details/i.test(error.message ?? '')
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not specified'
}

function ProviderBookingCard({ booking, expanded, onToggle, onUpdate, isUpdating }: {
  booking: BookingWithResource
  expanded: boolean
  onToggle: () => void
  onUpdate: (payload: ProviderUpdatePayload) => void
  isUpdating: boolean
}) {
  const [providerNotes, setProviderNotes] = useState(booking.provider_notes ?? '')
  const [decisionNote, setDecisionNote] = useState(booking.decision_note ?? '')
  const trip = transportDetails(booking)
  const transportation = isTransportationRequest(booking)

  const saveNotes = () => onUpdate({
    id: booking.id,
    provider_notes: providerNotes || null,
    decision_note: decisionNote || null,
  })

  return (
    <div className="card">
      <button className="w-full flex items-center gap-3 text-left" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{booking.requester_name}</p>
            <span className={STATUS_STYLE[booking.status] ?? 'badge'}>{booking.status.replace('_', ' ')}</span>
            {transportation && (
              <span className="badge bg-cyan-50 text-cyan-700 inline-flex items-center gap-1">
                <Navigation size={12} /> Transportation
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {booking.resource?.name}
            {!transportation && <> · {booking.adults} adult{booking.adults !== 1 ? 's' : ''}{booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}</>}
            {' · '}{new Date(booking.created_at).toLocaleDateString()}
          </p>
        </div>
        <ChevronDown size={16} className={clsx('text-gray-400 shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
          {trip && (
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Trip request</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">From</p>
                  <p className="mt-1 font-semibold text-gray-900">{trip.origin_text}</p>
                </div>
                <span className="hidden text-gray-300 sm:block">→</span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">To</p>
                  <p className="mt-1 font-semibold text-gray-900">{trip.destination_text}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                <span><strong>When:</strong> {trip.requested_trip_at ? formatDateTime(trip.requested_trip_at) : trip.requested_time_window || 'Not specified'}</span>
                <span><strong>Need:</strong> {trip.requested_kind.replace(/_/g, ' ')}</span>
                {trip.requested_modes?.length > 0 && <span><strong>Modes:</strong> {trip.requested_modes.join(', ')}</span>}
                {trip.wheelchair_required && <span className="font-semibold text-cyan-800">Wheelchair-accessible requested</span>}
              </div>
              {trip.mobility_notes && <p className="mt-2 text-sm text-gray-700"><strong>Mobility:</strong> {trip.mobility_notes}</p>}
            </div>
          )}

          <div className="rounded-xl bg-gray-50 p-3 space-y-2 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Requester contact</p>
            <div className="flex flex-wrap gap-3">
              {booking.requester_phone ? (
                <a href={`tel:${booking.requester_phone}`} className="flex items-center gap-1.5 text-primary-600 font-medium">
                  <Phone size={14} /> {booking.requester_phone}
                </a>
              ) : <span className="text-gray-400">No phone</span>}
              {booking.requester_email ? (
                <a href={`mailto:${booking.requester_email}`} className="flex items-center gap-1.5 text-primary-600 font-medium">
                  <Mail size={14} /> {booking.requester_email}
                </a>
              ) : <span className="text-gray-400">No email</span>}
            </div>
            <p>Preference: <span className="capitalize">{booking.contact_preference ?? 'Not provided'}</span></p>
            <p>Best contact time: {booking.best_contact_time || 'Not provided'}</p>
          </div>

          {!transportation && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} />
                {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                {booking.children > 0 && `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`}
              </div>
              <p className="text-sm text-gray-600">Dates: {booking.check_in_date || 'Not provided'} → {booking.check_out_date || 'Not provided'}</p>
            </>
          )}

          {booking.notes && (
            <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              <MessageSquare size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <p className="whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Provider notes</label>
              <textarea value={providerNotes} onChange={e => setProviderNotes(e.target.value)} className="input min-h-[90px] resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Decision note</label>
              <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} className="input min-h-[90px] resize-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={saveNotes} disabled={isUpdating} className="badge bg-gray-900 text-white py-1.5 px-3 cursor-pointer transition-colors">
              Save Notes
            </button>
            {ACTIONS.map(action => (
              <button
                key={action.status}
                onClick={() => onUpdate({ id: booking.id, status: action.status, provider_notes: providerNotes || null, decision_note: decisionNote || null })}
                disabled={isUpdating || booking.status === action.status}
                className="badge bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white disabled:opacity-40 py-1.5 px-3 cursor-pointer transition-colors text-xs"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProviderBookings() {
  const { providerId } = useAuthStore()
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [transportOnly, setTransportOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const toast = useToast()
  const qc = useQueryClient()

  const { data: resources = [] } = useQuery({
    queryKey: ['provider-resources', providerId],
    queryFn: async () => {
      const { data } = await db.resources().select('id').eq('provider_id', providerId!)
      return (data ?? []) as { id: string }[]
    },
    enabled: !!providerId,
  })

  const { data: allBookings = [], isLoading } = useQuery<BookingWithResource[]>({
    queryKey: ['provider-bookings', providerId, resources.map(r => r.id).join(',')],
    queryFn: async () => {
      const ids = resources.map(r => r.id)
      if (!ids.length) return []
      const base = '*, resource:resources(name, category)'
      const withTrip = `${base}, transportation:booking_transportation_details(*)`
      let { data, error } = await db.bookings()
        .select(withTrip)
        .in('resource_id', ids)
        .order('created_at', { ascending: false })

      if (error && isMissingTransportationRelation(error)) {
        const retry = await db.bookings()
          .select(base)
          .in('resource_id', ids)
          .order('created_at', { ascending: false })
        data = retry.data
        error = retry.error
      }
      if (error) throw error
      return (data ?? []) as unknown as BookingWithResource[]
    },
    enabled: !!providerId,
  })

  const updateBooking = useMutation({
    mutationFn: async ({ id, status, provider_notes, decision_note }: ProviderUpdatePayload) => {
      const now = new Date().toISOString()
      const payload: Record<string, string | null> = {
        provider_notes: provider_notes ?? null,
        decision_note: decision_note ?? null,
      }
      if (status) {
        payload.status = status
        if (status === 'contacted' || status === 'no_response') payload.last_contacted_at = now
        if (status === 'confirmed' || status === 'needs_info' || status === 'closed' || status === 'completed') payload.decided_at = now
      }
      const { error } = await db.bookings().update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Booking updated')
      qc.invalidateQueries({ queryKey: ['provider-bookings'] })
      qc.invalidateQueries({ queryKey: ['provider-bookings-recent'] })
    },
    onError: (e: Error) => toast.error('Update failed', e.message),
  })

  const counts = STATUSES.reduce((acc, status) => {
    if (status !== 'all') acc[status] = allBookings.filter(b => b.status === status).length
    return acc
  }, {} as Record<string, number>)

  const bookings = allBookings.filter((booking) =>
    (filter === 'all' || booking.status === filter)
    && (!transportOnly || isTransportationRequest(booking)),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">{allBookings.length} request{allBookings.length !== 1 ? 's' : ''} total</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx('badge shrink-0 py-1.5 px-3 cursor-pointer transition-colors capitalize', {
              'bg-gray-900 text-white': filter === s,
              'bg-gray-100 text-gray-700 hover:bg-gray-200': filter !== s,
            })}
          >
            {s === 'all' ? `All (${allBookings.length})` : `${s.replace('_', ' ')}${counts[s] > 0 ? ` (${counts[s]})` : ''}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTransportOnly((value) => !value)}
          className={clsx('badge shrink-0 py-1.5 px-3 cursor-pointer transition-colors inline-flex items-center gap-1', {
            'bg-cyan-700 text-white': transportOnly,
            'bg-cyan-50 text-cyan-700 hover:bg-cyan-100': !transportOnly,
          })}
        >
          <Navigation size={12} /> Transportation
        </button>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>}

      {!isLoading && bookings.length === 0 && (
        <div className="card text-center py-16">
          <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No requests match this filter</p>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map(b => (
          <ProviderBookingCard
            key={b.id}
            booking={b}
            expanded={expanded === b.id}
            onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
            onUpdate={payload => updateBooking.mutate(payload)}
            isUpdating={updateBooking.isPending}
          />
        ))}
      </div>
    </div>
  )
}
