import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import BedCountUpdater from '@/components/provider/BedCountUpdater'
import type { Resource, Booking } from '@/types'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function ProviderDashboard() {
  const { providerId } = useAuthStore()

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['provider-resources', providerId],
    queryFn: async () => {
      const { data } = await db.resources().select('*').eq('provider_id', providerId!)
      return (data ?? []) as Resource[]
    },
    enabled: !!providerId,
  })

  const { data: recentBookings = [] } = useQuery<Booking[]>({
    queryKey: ['provider-bookings-recent', providerId],
    queryFn: async () => {
      const ids = resources.map(r => r.id)
      if (!ids.length) return []
      const { data } = await db.bookings()
        .select('*, resource:resources(name)')
        .in('resource_id', ids)
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as unknown as Booking[]
    },
    enabled: resources.length > 0,
  })

  const pendingCount   = recentBookings.filter(b => b.status === 'pending').length
  const activeListings = resources.filter(r => r.is_active).length
  const availableBeds  = resources.reduce((sum, r) => sum + (r.beds_available ?? 0), 0)
  const shelters       = resources.filter(r => r.category === 'shelter')

  const STATUS_STYLE: Record<string, string> = {
    pending:    'badge-pending',
    confirmed:  'badge-verified',
    waitlisted: 'badge bg-orange-50 text-orange-700',
    cancelled:  'badge bg-gray-100 text-gray-500',
    completed:  'badge-available',
    no_show:    'badge bg-red-50 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back — here's what's happening</p>
        </div>
        <Link to="/portal/listings/new" className="btn-primary btn-sm gap-1.5">
          <Plus size={16} /> New Listing
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active listings"  value={activeListings}        icon={CheckCircle}  color="bg-primary-600" />
        <StatCard label="Available beds"   value={availableBeds}         icon={BedDouble}    color="bg-success-600" />
        <StatCard label="Pending requests" value={pendingCount}          icon={Clock}        color="bg-warning-600" />
        <StatCard label="Recent requests"  value={recentBookings.length} icon={CalendarDays} color="bg-purple-500"  />
      </div>

      {shelters.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BedDouble size={18} className="text-primary-600" /> Live Bed Availability
          </h2>
          <div className="space-y-3">
            {shelters.map(r => <BedCountUpdater key={r.id} resource={r} />)}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Recent Requests</h2>
          <Link to="/portal/bookings" className="text-sm text-primary-600 font-medium hover:underline">View all</Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="card text-center py-10">
            <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No booking requests yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentBookings.map(b => (
              <div key={b.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{b.requester_name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {(b as unknown as { resource?: { name: string } }).resource?.name}
                    {' · '}{b.adults} adult{b.adults !== 1 ? 's' : ''}
                    {b.children > 0 ? `, ${b.children} child${b.children !== 1 ? 'ren' : ''}` : ''}
                  </p>
                </div>
                <span className={STATUS_STYLE[b.status] ?? 'badge'}>{b.status}</span>
                <p className="text-xs text-gray-400 shrink-0">{new Date(b.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {resources.length === 0 && (
        <div className="card border-2 border-dashed border-gray-200 text-center py-12">
          <AlertTriangle size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 mb-1">No listings yet</p>
          <p className="text-sm text-gray-500 mb-4">Add your first resource so people can find you on the map.</p>
          <Link to="/portal/listings/new" className="btn-primary">Add your first listing</Link>
        </div>
      )}
    </div>
  )
}
