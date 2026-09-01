import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Building2, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react'
import SeoHead from '@/lib/seo/SeoHead'
import { useClaimableProviders } from '@/lib/claims'
import { useI18n, translate } from '@/lib/i18n'

export default function ClaimIndexPage() {
  const { t, lang } = useI18n()
  /** `translate` plus `{placeholder}` substitution, matching @/lib/resourceFaq's pattern. */
  const tv = (key: string, vars: Record<string, string> = {}) => {
    let s = translate(lang, key)
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
    return s
  }
  const [search, setSearch] = useState('')
  const { data: orgs = [], isLoading, isError } = useClaimableProviders()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter(o =>
      o.organization_name.toLowerCase().includes(q) ||
      (o.website ?? '').toLowerCase().includes(q)
    )
  }, [orgs, search])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-12">
      <SeoHead
        title={t('claim.index.seoTitle')}
        description={t('claim.index.seoDescription')}
        path="/claim"
      />

      {/* ── Header ── */}
      <div className="text-center space-y-4 mb-9">
        <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full px-3 py-1.5">
          <ShieldCheck size={13} /> {t('claim.index.badge')}
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          {t('claim.index.heading')}
        </h1>
        <p className="text-gray-500 leading-relaxed">
          {t('claim.index.introBefore')} <strong>{t('badge.communityListed')}</strong> {t('claim.index.introAfter')}
        </p>
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-5 shadow-sm">
        <Search size={17} className="text-gray-400 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('claim.index.searchPlaceholder')}
          aria-label={t('claim.index.searchAria')}
          className="bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none w-full"
        />
      </div>

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 w-full" />)}
        </div>
      )}

      {isError && (
        <div className="text-center py-14 text-gray-500">
          <AlertTriangle size={26} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">{t('claim.index.loadError')}</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {tv(filtered.length === 1 ? 'claim.index.countOne' : 'claim.index.countOther', { count: String(filtered.length) })}
          </p>

          {filtered.length === 0 && (
            <div className="text-center py-14 text-gray-500">
              <Building2 size={26} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                {search
                  ? tv('claim.index.noMatchSearch', { search })
                  : t('claim.index.noMatchEmpty')}
              </p>
              <p className="text-sm mt-3">
                {t('claim.index.notFindingYours')}{' '}
                <Link to="/login?signup=1" className="text-primary-600 font-medium hover:underline">
                  {t('claim.index.registerNewProvider')}
                </Link>.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {filtered.map(org => (
              <li key={org.id}>
                <Link
                  to={`/claim/${org.id}`}
                  className="card-hover flex items-start gap-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Building2 size={17} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 leading-snug">{org.organization_name}</h2>
                    {org.website && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {org.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </p>
                    )}
                    {org.bio && <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{org.bio}</p>}
                  </div>
                  <ArrowRight
                    size={17}
                    className="text-gray-300 group-hover:text-primary-600 transition-colors shrink-0 mt-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-10 rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center">
        <p className="text-sm text-gray-600">
          {t('claim.index.dontSeeOrg')}
        </p>
        <Link to="/provider/onboarding" className="btn-primary btn-sm mt-3 gap-1.5">
          {t('claim.index.registerAsProvider')} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
