import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Search } from 'lucide-react'
import { db } from '@/lib/supabase'
import type { Booking } from '@/types'

type BookingRow = Booking & { resource?: { name: string } }

const STATUS_STYLE: Record<string, string> = {
  pending:    'badge-pending',
  confirmed:  'badge-verified',
  waitlisted: 'badge bg-orange-900/30 text-orange-400',
  cancelled:  'badge bg-gray-700 text-gray-400',
  completed:  'badge bg-green-900/30 text-green-400',
  no_show:    'badge bg-red-900/30 text-red-400',
}

export default function AdminBookings() {
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: bookings = [], isLoading } = useQuery<BookingRow[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data } = await db.bookings()
        .select('*, resource:resources(name)')
        .order('created_at', { ascending: false })
        .limit(200)
      return (data ?? []) as unknown as BookingRow[]
    },
  })

  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const matchSearch = !search || b.requester_name.toLowerCase().includes(search.toLowerCase()) ||
      b.resource?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const STATUSES = ['all','pending','confirmed','waitlisted','cancelled','completed','no_show']

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
            placeholder="Search by name or resource…"
            className="bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none w-full" />
        </div>
      </div>

      {isLoading && <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16 w-full bg-gray-800" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <CalendarDays size={28} className="mx-auto mb-2 text-gray-600" />
          <p>No bookings match this filter</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl overflow-hidden">
        {filtered.map((b, i) => (
          <div key={b.id} className={`flex items-center gap-4 px-4 py-3 ${i < filtered.length - 1 ? 'border-b border-gray-700' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{b.requester_name}</p>
              <p className="text-xs text-gray-400 truncate">
                {b.resource?.name ?? 'Unknown resource'} · {b.adults} adult{b.adults !== 1 ? 's' : ''}
                {b.children > 0 ? `, ${b.children} child${b.children !== 1 ? 'ren' : ''}` : ''}
              </p>
            </div>
            <span className={`${STATUS_STYLE[b.status] ?? 'badge'} shrink-0`}>{b.status.replace('_',' ')}</span>
            <p className="text-xs text-gray-500 shrink-0">{new Date(b.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
