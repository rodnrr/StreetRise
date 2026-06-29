import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, CalendarDays, Clock, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '@/lib/supabase'

export default function AdminDashboard() {
  const { data: providerStats } = useQuery({
    queryKey: ['admin-stats-providers'],
    queryFn: async () => {
      const { data } = await db.providers().select('verification_status')
      if (!data) return { total: 0, pending: 0, verified: 0 }
      return {
        total:    data.length,
        pending:  data.filter(p => p.verification_status === 'pending').length,
        verified: data.filter(p => p.verification_status === 'verified').length,
      }
    },
  })

  const { data: resourceStats } = useQuery({
    queryKey: ['admin-stats-resources'],
    queryFn: async () => {
      const { data } = await db.resources().select('verification_status, availability_status, is_active')
      if (!data) return { total: 0, pending: 0, active: 0, available: 0 }
      return {
        total:     data.length,
        pending:   data.filter(r => r.verification_status === 'pending').length,
        active:    data.filter(r => r.is_active).length,
        available: data.filter(r => r.availability_status === 'available').length,
      }
    },
  })

  const { data: bookingStats } = useQuery({
    queryKey: ['admin-stats-bookings'],
    queryFn: async () => {
      const { data } = await db.bookings().select('status')
      const rows = (data ?? []) as { status: string }[]
      return {
        total:   rows.length,
        pending: rows.filter((b: { status: string }) => b.status === 'pending').length,
      }
    },
  })

  const { data: messageStats } = useQuery({
    queryKey: ['admin-stats-messages'],
    queryFn: async () => {
      const { data } = await db.conversations().select('status') as { data: { status: string }[] | null }
      if (!data) return { total: 0, open: 0 }
      return {
        total: data.length,
        open:  data.filter(c => c.status === 'open').length,
      }
    },
  })

  const cards = [
    { label: 'Total Providers', value: providerStats?.total ?? '…', sub: `${providerStats?.pending ?? 0} pending verification`, icon: Building2, color: 'bg-primary-600', href: '/admin/providers' },
    { label: 'Total Resources', value: resourceStats?.total ?? '…', sub: `${resourceStats?.pending ?? 0} pending review`, icon: MapPin, color: 'bg-purple-600', href: '/admin/resources' },
    { label: 'Total Bookings', value: bookingStats?.total ?? '…', sub: `${bookingStats?.pending ?? 0} pending`, icon: CalendarDays, color: 'bg-success-600', href: '/admin/bookings' },
    { label: 'Active Listings', value: resourceStats?.active ?? '…', sub: `${resourceStats?.available ?? 0} with beds available`, icon: CheckCircle, color: 'bg-warning-600', href: '/admin/resources' },
    { label: 'Messages', value: messageStats?.total ?? '…', sub: `${messageStats?.open ?? 0} open conversation${messageStats?.open !== 1 ? 's' : ''}`, icon: MessageSquare, color: 'bg-sky-600', href: '/admin/messages' },
  ]

  const hasPendingProviders  = (providerStats?.pending  ?? 0) > 0
  const hasPendingResources  = (resourceStats?.pending  ?? 0) > 0
  const hasOpenMessages      = (messageStats?.open       ?? 0) > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform overview and moderation queue</p>
      </div>

      {/* Alerts */}
      {(hasPendingProviders || hasPendingResources || hasOpenMessages) && (
        <div className="space-y-2">
          {hasPendingProviders && (
            <Link to="/admin/providers" className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-xl px-4 py-3 text-sm hover:bg-yellow-500/20 transition-colors">
              <AlertTriangle size={16} className="shrink-0" />
              <span><strong>{providerStats?.pending}</strong> provider{providerStats?.pending !== 1 ? 's' : ''} awaiting verification</span>
            </Link>
          )}
          {hasPendingResources && (
            <Link to="/admin/resources" className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl px-4 py-3 text-sm hover:bg-blue-500/20 transition-colors">
              <Clock size={16} className="shrink-0" />
              <span><strong>{resourceStats?.pending}</strong> resource{resourceStats?.pending !== 1 ? 's' : ''} pending review</span>
            </Link>
          )}
          {hasOpenMessages && (
            <Link to="/admin/messages" className="flex items-center gap-3 bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-xl px-4 py-3 text-sm hover:bg-sky-500/20 transition-colors">
              <MessageSquare size={16} className="shrink-0" />
              <span><strong>{messageStats?.open}</strong> open message thread{messageStats?.open !== 1 ? 's' : ''} from providers</span>
            </Link>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, sub, icon: Icon, color, href }) => (
          <Link key={label} to={href} className="bg-gray-800 rounded-2xl p-4 hover:bg-gray-700 transition-colors">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} mb-3`}>
              <Icon size={17} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-gray-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Review Providers', href: '/admin/providers', badge: providerStats?.pending },
            { label: 'Review Resources', href: '/admin/resources', badge: resourceStats?.pending },
            { label: 'Add Resource',     href: '/admin/resources/new', badge: 0 },
            { label: 'View Bookings',    href: '/admin/bookings',  badge: bookingStats?.pending },
            { label: 'Messages',         href: '/admin/messages',  badge: messageStats?.open },
            { label: 'Manage FAQ',       href: '/admin/faq',       badge: 0 },
          ].map(({ label, href, badge }) => (
            <Link
              key={label}
              to={href}
              className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-4 py-3 text-sm text-gray-200 transition-colors"
            >
              <span>{label}</span>
              {(badge ?? 0) > 0 && (
                <span className="bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full px-2 py-0.5">{badge}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}