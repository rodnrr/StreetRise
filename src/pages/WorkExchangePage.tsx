import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMapStore } from '@/lib/store'
import { db } from '@/lib/supabase'
import { MapPin, Clock, Briefcase, Search } from 'lucide-react'
import clsx from 'clsx'
import type { WorkExchange } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  volunteering: 'badge bg-blue-50 text-blue-700',
  paid:         'badge bg-green-50 text-green-700',
  skills_trade: 'badge bg-purple-50 text-purple-700',
  internship:   'badge bg-yellow-50 text-yellow-700',
}

const TYPE_LABEL: Record<string, string> = {
  volunteering: 'Volunteer', paid: 'Paid', skills_trade: 'Skills Trade', internship: 'Internship'
}

export default function WorkExchangePage() {
  const { mapCenter }       = useMapStore()
  const [search, setSearch] = useState('')
  const [type, setType]     = useState<string>('all')

  const { data: listings = [], isLoading } = useQuery<WorkExchange[]>({
    queryKey: ['work-exchanges', mapCenter],
    queryFn: async () => {
      const { data } = await db.work_exchanges()
        .select('*, providers(organization_name, contact_email, website)')
        .eq('is_active', true)
        .gte('lat', mapCenter.lat - 0.5)
        .lte('lat', mapCenter.lat + 0.5)
        .gte('lng', mapCenter.lng - 0.5)
        .lte('lng', mapCenter.lng + 0.5)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data ?? []) as unknown as WorkExchange[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const filtered = listings.filter(wx => {
    const matchType = type === 'all' || wx.exchange_type === type
    const matchSearch = !search || wx.title.toLowerCase().includes(search.toLowerCase()) ||
      wx.description.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Briefcase size={24} className="text-primary-600" /> Work Exchange
        </h1>
        <p className="text-gray-500 text-sm mt-1">Volunteer, paid, and skills-trade opportunities near you</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm mb-4">
        <Search size={16} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search opportunities…"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400" />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(['all', 'volunteering', 'paid', 'skills_trade', 'internship'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={clsx('badge py-1.5 px-3 cursor-pointer transition-colors text-xs', {
              'bg-primary-600 text-white': type === t,
              'bg-gray-100 text-gray-600 hover:bg-gray-200': type !== t,
            })}>
            {t === 'all' ? 'All Types' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 w-full" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Briefcase size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400">No opportunities found near you.</p>
          <p className="text-sm text-gray-300 mt-1">Try adjusting your location on the map.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(wx => (
          <div key={wx.id} className="card-hover">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">{wx.title}</h3>
                  <span className={TYPE_STYLE[wx.exchange_type] ?? 'badge'}>{TYPE_LABEL[wx.exchange_type]}</span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> {wx.address.city}, {wx.address.state}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-700 line-clamp-2 mb-3">{wx.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {wx.hours_per_week && (
                <span className="flex items-center gap-1"><Clock size={12} /> {wx.hours_per_week} hrs/week</span>
              )}
              {wx.compensation && (
                <span className="font-medium text-primary-600">{wx.compensation}</span>
              )}
            </div>

            {wx.skills_required?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {wx.skills_required.map(s => (
                  <span key={s} className="badge bg-gray-100 text-gray-600 text-xs">{s}</span>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {(wx as unknown as { providers?: { organization_name: string } }).providers?.organization_name ?? 'Organization'}
              </p>
              {(() => {
                const provider = (wx as unknown as { providers?: { organization_name: string; contact_email?: string; website?: string } }).providers
                if (provider?.website) {
                  return (
                    <a href={provider.website} target="_blank" rel="noopener noreferrer"
                       className="btn-primary btn-sm">
                      Apply on Website
                    </a>
                  )
                }
                if (provider?.contact_email) {
                  return (
                    <a href={`mailto:${provider.contact_email}?subject=Interest in: ${encodeURIComponent(wx.title)}`}
                       className="btn-primary btn-sm">
                      Email to Apply
                    </a>
                  )
                }
                return (
                  <span className="text-xs text-gray-400 italic">Contact provider directly</span>
                )
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
