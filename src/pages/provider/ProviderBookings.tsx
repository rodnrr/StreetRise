import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Phone, Mail, Users, MessageSquare, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { Booking, BookingStatus } from '@/types'

const STATUSES: BookingStatus[] = ['pending','confirmed','waitlisted','cancelled','completed','no_show']

const STATUS_STYLE: Record<string, string> = {
  pending:    'badge-pending',
  confirmed:  'badge-verified',
  waitlisted: 'badge bg-orange-50 text-orange-700',
  cancelled:  'badge bg-gray-100 text-gray-500',
  completed:  'badge-available',
  no_show:    'badge bg-red-50 text-red-700',
}

type BookingWithResource = Booking & { resource?: { name: string } }

export default function ProviderBookings() {
  const { providerId }   = useAuthStore()
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const toast            = useToast()
  const qc               = useQueryClient()

  const { data: resources = [] } = useQuery({
    queryKey: ['provider-resources', providerId],
    queryFn: async () => {
      const { data } = await db.resources().select('id').eq('provider_id', providerId!)
      return (data ?? []) as { id: string }[]
    },
    enabled: !!providerId,
  })

  const { data: bookings = [], isLoading } = useQuery<BookingWithResource[]>({
    queryKey: ['provider-bookings', providerId, filter],
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
    enabled: resources.length > 0,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await db.bookings().update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      toast.success('Status updated', `Booking marked as ${status}`)
      qc.invalidateQueries({ queryKey: ['provider-bookings'] })
      qc.invalidateQueries({ queryKey: ['provider-bookings-recent'] })
    },
    onError: (e: Error) => toast.error('Update failed', e.message),
  })

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = bookings.filter(b => b.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bookings.length} request{bookings.length !== 1 ? 's' : ''} total</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={clsx('badge shrink-0 py-1.5 px-3 cursor-pointer transition-colors', {
            'bg-gray-900 text-white': filter === 'all',
            'bg-gray-100 text-gray-700 hover:bg-gray-200': filter !== 'all',
          })}
        >
          All ({bookings.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx('badge shrink-0 py-1.5 px-3 cursor-pointer transition-colors capitalize', {
              'bg-gray-900 text-white': filter === s,
              'bg-gray-100 text-gray-700 hover:bg-gray-200': filter !== s,
            })}
          >
            {s.replace('_', ' ')} {counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="card text-center py-16">
          <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No {filter !== 'all' ? filter : ''} booking requests</p>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map(b => (
          <div key={b.id} className="card">
            {/* Summary row */}
            <button
              className="w-full flex items-center gap-3 text-left"
              onClick={() => setExpanded(expanded === b.id ? null : b.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{b.requester_name}</p>
                  <span className={STATUS_STYLE[b.status] ?? 'badge'}>{b.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {b.resource?.name} · {b.adults} adult{b.adults !== 1 ? 's' : ''}
                  {b.children > 0 ? `, ${b.children} child${b.children !== 1 ? 'ren' : ''}` : ''}
                  {' · '}{new Date(b.created_at).toLocaleDateString()}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={clsx('text-gray-400 shrink-0 transition-transform', expanded === b.id && 'rotate-180')}
              />
            </button>

            {/* Expanded details */}
            {expanded === b.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-fade-in">
                {/* Contact */}
                <div className="flex flex-wrap gap-3">
                  {b.requester_phone && (
                    <a href={`tel:${b.requester_phone}`} className="flex items-center gap-1.5 text-sm text-primary-600 font-medium">
                      <Phone size={14} /> {b.requester_phone}
                    </a>
                  )}
                  {b.requester_email && (
                    <a href={`mailto:${b.requester_email}`} className="flex items-center gap-1.5 text-sm text-primary-600 font-medium">
                      <Mail size={14} /> {b.requester_email}
                    </a>
                  )}
                </div>

                {/* Guests */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={14} />
                  {b.adults} adult{b.adults !== 1 ? 's' : ''}
                  {b.children > 0 && `, ${b.children} child${b.children !== 1 ? 'ren' : ''}`}
                </div>

                {/* Dates */}
                {(b.check_in_date || b.check_out_date) && (
                  <p className="text-sm text-gray-600">
                    📅 {b.check_in_date ?? '?'} → {b.check_out_date ?? '?'}
                  </p>
                )}

                {/* Notes */}
                {b.notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                    <MessageSquare size={14} className="mt-0.5 shrink-0 text-gray-400" />
                    <p>{b.notes}</p>
                  </div>
                )}

                {/* Status update */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {STATUSES.filter(s => s !== b.status).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus.mutate({ id: b.id, status: s })}
                      disabled={updateStatus.isPending}
                      className="badge bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white py-1.5 px-3 cursor-pointer transition-colors capitalize text-xs"
                    >
                      Mark {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
