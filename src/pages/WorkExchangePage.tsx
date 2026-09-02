import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMapStore } from '@/lib/store'
import { db } from '@/lib/supabase'
import { MapPin, Clock, Briefcase, Search } from 'lucide-react'
import clsx from 'clsx'
import { useI18n } from '@/lib/i18n'
import type { WorkExchange } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  volunteering: 'badge bg-blue-50 text-blue-700',
  paid:         'badge bg-green-50 text-green-700',
  skills_trade: 'badge bg-purple-50 text-purple-700',
  internship:   'badge bg-yellow-50 text-yellow-700',
}

const TYPE_LABEL_KEY: Record<string, string> = {
  volunteering: 'work.type.volunteer',
  paid: 'work.type.paid',
  skills_trade: 'work.type.skillsTrade',
  internship: 'work.type.internship',
}

export default function WorkExchangePage() {
  const { t } = useI18n()
  const { mapCenter }       = useMapStore()
  const [search, setSearch] = useState('')
  const [type, setType]     = useState<string>('all')
  const [scope, setScope]   = useState<'near' | 'all'>('all')

  const { data: listings = [], isLoading } = useQuery<WorkExchange[]>({
    queryKey: ['work-exchanges', scope, scope === 'near' ? mapCenter : null],
    queryFn: async () => {
      let query = db.work_exchanges()
        .select('*, providers(organization_name, contact_email, website)')
        .eq('is_active', true)
      if (scope === 'near') {
        query = query
          .gte('lat', mapCenter.lat - 0.5)
          .lte('lat', mapCenter.lat + 0.5)
          .gte('lng', mapCenter.lng - 0.5)
          .lte('lng', mapCenter.lng + 0.5)
      }
      const { data } = await query
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Briefcase size={24} className="text-primary-600" /> {t('work.pageTitle')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {scope === 'all'
            ? t('work.subtitleAll')
            : t('work.subtitleNear')}
        </p>
      </div>

      {/* Scope toggle */}
      <div className="flex gap-2 mb-4">
        {([
          ['all', t('work.scopeAll')],
          ['near', t('work.scopeNear')],
        ] as const).map(([value, label]) => (
          <button key={value} onClick={() => setScope(value)}
            className={clsx('badge py-1.5 px-3 cursor-pointer transition-colors text-xs', {
              'bg-primary-600 text-white': scope === value,
              'bg-gray-100 text-gray-600 hover:bg-gray-200': scope !== value,
            })}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm mb-4">
        <Search size={16} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('work.searchPlaceholder')}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400" />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(['all', 'volunteering', 'paid', 'skills_trade', 'internship'] as const).map(opt => (
          <button key={opt} onClick={() => setType(opt)}
            className={clsx('badge py-1.5 px-3 cursor-pointer transition-colors text-xs', {
              'bg-primary-600 text-white': type === opt,
              'bg-gray-100 text-gray-600 hover:bg-gray-200': type !== opt,
            })}>
            {opt === 'all' ? t('work.allTypes') : t(TYPE_LABEL_KEY[opt])}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 w-full" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Briefcase size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400">
            {scope === 'near' ? t('work.emptyNear') : t('work.emptyAll')}
          </p>
          <p className="text-sm text-gray-300 mt-1">
            {scope === 'near'
              ? t('work.emptyNearHint')
              : t('work.emptyAllHint')}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(wx => (
          <div key={wx.id} className="card-hover">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 lang="en" className="font-semibold text-gray-900">{wx.title}</h3>
                  <span className={TYPE_STYLE[wx.exchange_type] ?? 'badge'}>{t(TYPE_LABEL_KEY[wx.exchange_type])}</span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> {wx.address.city}, {wx.address.state}
                </p>
              </div>
            </div>

            <p lang="en" className="text-sm text-gray-700 line-clamp-2 mb-3">{wx.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {wx.hours_per_week && (
                <span className="flex items-center gap-1"><Clock size={12} /> {wx.hours_per_week} {t('work.hrsPerWeek')}</span>
              )}
              {wx.compensation && (
                <span lang="en" className="font-medium text-primary-600">{wx.compensation}</span>
              )}
            </div>

            {wx.skills_required?.length > 0 && (
              <div lang="en" className="flex flex-wrap gap-1.5 mt-3">
                {wx.skills_required.map(s => (
                  <span key={s} className="badge bg-gray-100 text-gray-600 text-xs">{s}</span>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {(wx as unknown as { providers?: { organization_name: string } }).providers?.organization_name ?? t('work.organizationFallback')}
              </p>
              {(() => {
                const provider = (wx as unknown as { providers?: { organization_name: string; contact_email?: string; website?: string } }).providers
                if (provider?.website) {
                  return (
                    <a href={provider.website} target="_blank" rel="noopener noreferrer"
                       className="btn-primary btn-sm">
                      {t('work.applyOnWebsite')}
                    </a>
                  )
                }
                if (provider?.contact_email) {
                  return (
                    <a href={`mailto:${provider.contact_email}?subject=Interest in: ${encodeURIComponent(wx.title)}`}
                       className="btn-primary btn-sm">
                      {t('work.emailToApply')}
                    </a>
                  )
                }
                return (
                  <span className="text-xs text-gray-400 italic">{t('work.contactDirectly')}</span>
                )
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
