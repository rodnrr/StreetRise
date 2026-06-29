import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Phone, Mail, Users, MessageSquare, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { Booking, BookingStatus } from '@/types'

const STATUSES: (BookingStatus | 'all')[] = ['all','pending','confirmed','declined','needs_info','contacted','no_response','closed']

const ACTIONS: { label: string; status: BookingStatus }[] = [
  { label: 'Confirm', status: 'confirmed' },
  { label: 'Decline', status: 'declined' },
  { label: 'Needs Info', status: 'needs_info' },
  { label: 'Mark Contacted', status: 'contacted' },
  { label: 'No Response', status: 'no_response' },
]

const STATUS_STYLE: Record<string, string> = {
  pending:     'badge-pending',
  confirmed:   'badge-verified',
  declined:    'badge-rejected',
  needs_info:  'badge bg-yellow-50 text-yellow-700',
  contacted:   'badge bg-blue-50 text-blue-700',
  no_response: 'badge bg-orange-50 text-orange-700',
  closed:      'badge bg-gray-100 text-gray-500',
  waitlisted:  'badge bg-orange-50 text-orange-700',
  cancelled:   'badge bg-gray-100 text-gray-500',
  completed:   'badge-available',
  no_show:     'badge bg-red-50 text-red-700',
}

type BookingWithResource = Booking & { resource?: { name: string } | null }

type ProviderUpdatePayload = {
  id: string
  status?: BookingStatus
  provider_notes?: string | null
  decision_note?: string | null
}

function formatDate(value?: string | null) {
  return value || 'Not provided'
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
          </div>
          <p className="text-xs text-gray-500 truncate">
            {booking.resource?.name} · {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
            {booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}
            {' · '}{new Date(booking.created_at).toLocaleDateString()}
          </p>
        </div>
        <ChevronDown size={16} className={clsx('text-gray-400 shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
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

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={14} />
            {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
            {booking.children > 0 && `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`}
          </div>

          <p className="text-sm text-gray-600">Dates: {formatDate(booking.check_in_date)} → {formatDate(booking.check_out_date)}</p>

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

  const { data: bookings = [], isLoading } = useQuery<BookingWithResource[]>({
    queryKey: ['provider-bookings', providerId, filter, resources.map(r => r.id).join(',')],
    queryFn: async () => {
      const ids = resources.map(r => r.id)
      if (!ids.length) return []
      let q = db.bookings()
        .select('*, resource:resources(name)')
        .in('resource_id', ids)
        .order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('status', filter)
      const { data } = await q
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
        if (status === 'confirmed' || status === 'declined' || status === 'needs_info') payload.decided_at = now
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

  const counts = STATUSES.reduce((acc, s) => {
    if (s !== 'all') acc[s] = bookings.filter(b => b.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bookings.length} request{bookings.length !== 1 ? 's' : ''} total</p>
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
            {s === 'all' ? `All (${bookings.length})` : `${s.replace('_', ' ')}${counts[s] > 0 ? ` (${counts[s]})` : ''}`}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>}

      {!isLoading && bookings.length === 0 && (
        <div className="card text-center py-16">
          <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No {filter !== 'all' ? filter.replace('_', ' ') : ''} booking requests</p>
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