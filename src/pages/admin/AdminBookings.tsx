import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Search, Phone, Mail, Users, MessageSquare } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { Booking, BookingStatus } from '@/types'

type BookingRow = Booking & {
  resource?: {
    name: string
    provider?: { organization_name: string } | null
  } | null
}

type UpdatePayload = {
  id: string
  status?: BookingStatus
  admin_notes?: string | null
  decision_note?: string | null
}

const ACTIONS: { label: string; status: BookingStatus }[] = [
  { label: 'Confirm', status: 'confirmed' },
  { label: 'Decline', status: 'declined' },
  { label: 'Needs Info', status: 'needs_info' },
  { label: 'Mark Contacted', status: 'contacted' },
  { label: 'No Response', status: 'no_response' },
  { label: 'Close', status: 'closed' },
]

const STATUSES = ['all','pending','confirmed','declined','needs_info','contacted','no_response','closed']

const STATUS_STYLE: Record<string, string> = {
  pending:     'badge-pending',
  confirmed:   'badge-verified',
  declined:    'badge-rejected',
  needs_info:  'badge bg-yellow-900/30 text-yellow-300',
  contacted:   'badge bg-blue-900/30 text-blue-300',
  no_response: 'badge bg-orange-900/30 text-orange-300',
  closed:      'badge bg-gray-700 text-gray-300',
  waitlisted:  'badge bg-orange-900/30 text-orange-400',
  cancelled:   'badge bg-gray-700 text-gray-400',
  completed:   'badge bg-green-900/30 text-green-400',
  no_show:     'badge bg-red-900/30 text-red-400',
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not provided'
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not recorded'
}

function AdminBookingCard({ booking, onUpdate, isUpdating }: {
  booking: BookingRow
  onUpdate: (payload: UpdatePayload) => void
  isUpdating: boolean
}) {
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes ?? '')
  const [decisionNote, setDecisionNote] = useState(booking.decision_note ?? '')

  const saveNotes = () => onUpdate({
    id: booking.id,
    admin_notes: adminNotes || null,
    decision_note: decisionNote || null,
  })

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-4 border border-gray-700">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-white">{booking.requester_name}</h2>
            <span className={`${STATUS_STYLE[booking.status] ?? 'badge'} capitalize`}>{booking.status.replace('_',' ')}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {booking.resource?.name ?? 'Unknown resource'} · {booking.resource?.provider?.organization_name ?? 'Unknown provider'}
          </p>
        </div>
        <p className="text-xs text-gray-500 shrink-0">Created {formatDateTime(booking.created_at)}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
        <div className="rounded-xl bg-gray-900/60 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Contact</p>
          <div className="space-y-1 text-gray-300">
            <p className="flex items-center gap-2"><Phone size={14} /> {booking.requester_phone || 'No phone'}</p>
            <p className="flex items-center gap-2"><Mail size={14} /> {booking.requester_email || 'No email'}</p>
            <p>Preference: <span className="capitalize">{booking.contact_preference ?? 'Not provided'}</span></p>
            <p>Best time: {booking.best_contact_time || 'Not provided'}</p>
            <p>Consent: {booking.contact_consent ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="rounded-xl bg-gray-900/60 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Request</p>
          <div className="space-y-1 text-gray-300">
            <p className="flex items-center gap-2"><Users size={14} /> {booking.adults} adult{booking.adults !== 1 ? 's' : ''}{booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}</p>
            <p>Check-in: {formatDate(booking.check_in_date)}</p>
            <p>Check-out: {formatDate(booking.check_out_date)}</p>
            <p>Last contacted: {formatDateTime(booking.last_contacted_at)}</p>
            <p>Decided: {formatDateTime(booking.decided_at)}</p>
          </div>
        </div>

        <div className="rounded-xl bg-gray-900/60 p-3 md:col-span-2 xl:col-span-1">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5"><MessageSquare size={13} /> Request notes</p>
          <p className="text-gray-300 whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Admin notes</label>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="w-full min-h-[90px] rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 outline-none focus:border-primary-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Decision note</label>
          <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} className="w-full min-h-[90px] rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 outline-none focus:border-primary-500" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={saveNotes} disabled={isUpdating} className="badge bg-white text-gray-900 hover:bg-gray-200 py-1.5 px-3 cursor-pointer">Save Notes</button>
        {ACTIONS.map(action => (
          <button
            key={action.status}
            onClick={() => onUpdate({ id: booking.id, status: action.status, admin_notes: adminNotes || null, decision_note: decisionNote || null })}
            disabled={isUpdating || booking.status === action.status}
            className="badge bg-gray-700 text-gray-200 hover:bg-primary-600 hover:text-white disabled:opacity-40 py-1.5 px-3 cursor-pointer"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AdminBookings() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const toast = useToast()
  const qc = useQueryClient()

  const { data: bookings = [], isLoading } = useQuery<BookingRow[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data } = await db.bookings()
        .select('*, resource:resources(name, provider:providers(organization_name))')
        .order('created_at', { ascending: false })
        .limit(200)
      return (data ?? []) as unknown as BookingRow[]
    },
  })

  const updateBooking = useMutation({
    mutationFn: async ({ id, status, admin_notes, decision_note }: UpdatePayload) => {
      const now = new Date().toISOString()
      const payload: Record<string, string | null> = {
        admin_notes: admin_notes ?? null,
        decision_note: decision_note ?? null,
      }
      if (status) {
        payload.status = status
        if (status === 'contacted' || status === 'no_response') payload.last_contacted_at = now
        if (status === 'confirmed' || status === 'declined' || status === 'needs_info' || status === 'closed') payload.decided_at = now
      }
      const { error } = await db.bookings().update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Booking updated')
      qc.invalidateQueries({ queryKey: ['admin-bookings'] })
    },
    onError: (e: Error) => toast.error('Update failed', e.message),
  })

  const filtered = bookings.filter(b => {
    const text = [b.requester_name, b.requester_email, b.requester_phone, b.resource?.name, b.resource?.provider?.organization_name]
      .filter(Boolean).join(' ').toLowerCase()
    return (statusFilter === 'all' || b.status === statusFilter) && (!search || text.includes(search.toLowerCase()))
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-sm text-gray-400 mt-0.5">All booking requests across the platform</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`badge py-1.5 px-3 cursor-pointer capitalize text-xs shrink-0 transition-colors ${
                statusFilter === s ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>{s.replace('_', ' ')}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 flex-1">
          <Search size={15} className="text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, contact, resource, provider…"
            className="bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none w-full" />
        </div>
      </div>

      {isLoading && <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-28 w-full bg-gray-800" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <CalendarDays size={28} className="mx-auto mb-2 text-gray-600" />
          <p>No bookings match this filter</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(b => (
          <AdminBookingCard key={b.id} booking={b} onUpdate={payload => updateBooking.mutate(payload)} isUpdating={updateBooking.isPending} />
        ))}
      </div>
    </div>
  )
}