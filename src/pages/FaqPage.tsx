import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, HelpCircle, Search } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import type { FaqItem } from '@/types'

export default function FaqPage() {
  const { t } = useI18n()
  const [search, setSearch]       = useState('')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [category, setCategory]   = useState<string>('all')

  const { data: items = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ['faq-public'],
    queryFn: async () => {
      const { data } = await db.faq().select('*').eq('is_active', true).order('order', { ascending: true })
      return (data ?? []) as FaqItem[]
    },
    staleTime: 1000 * 60 * 10,
  })

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))]
  const categoryLabel = (c: string) => c === 'all' ? t('faqPage.allCategories') : c.replace(/_/g, ' ')

  const filtered = items.filter(item => {
    const matchCat    = category === 'all' || item.category === category
    const matchSearch = !search || item.question.toLowerCase().includes(search.toLowerCase()) ||
                        item.answer.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <HelpCircle size={24} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('faqPage.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('faqPage.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm mb-4">
        <Search size={16} className="text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('faqPage.searchPlaceholder')}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx('badge py-1.5 px-3 cursor-pointer capitalize transition-colors text-xs', {
              'bg-primary-600 text-white': category === c,
              'bg-gray-100 text-gray-600 hover:bg-gray-200': category !== c,
            })}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full" />)}</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400">{t('faqPage.noResults')}</p>
        </div>
      )}

      {/* FAQ accordion */}
      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className="card overflow-hidden">
            <button
              className="w-full flex items-start gap-3 text-left"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              aria-expanded={expanded === item.id}
            >
              <div className="flex-1" lang="en">
                <p className="font-semibold text-gray-900 text-sm leading-snug">{item.question}</p>
                {expanded !== item.id && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.answer}</p>
                )}
              </div>
              <ChevronDown
                size={17}
                className={clsx('text-gray-400 shrink-0 mt-0.5 transition-transform', expanded === item.id && 'rotate-180')}
              />
            </button>

            {expanded === item.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in" lang="en">
                <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Crisis banner */}
      <div className="mt-8 p-4 bg-danger-50 border border-danger-500/20 rounded-2xl">
        <p className="font-semibold text-danger-600 text-sm mb-1">🚨 {t('faqPage.crisisTitle')}</p>
        <p className="text-sm text-danger-600">
          {t('faqPage.crisisCall')} <strong>911</strong>. {t('faqPage.crisisMentalHealth')} <strong>988</strong>. {t('faqPage.crisisDomesticViolence')} <strong>1-800-799-7233</strong>
        </p>
      </div>
    </div>
  )
}
