// ============================================================
// /housing — a curated view over canonical StreetRise resources
// ============================================================
//
// This page has NO database of its own. Every shortcut below is a saved search
// expressed in ordinary `MapFilters`, deep-linking into /map, which runs the
// same pipeline every other category uses. That is the whole architectural
// point: housing is a capability of the resource platform, not a second
// product bolted onto it.
//
// Consequently there is nothing here to keep in sync — add a housing listing
// through the normal provider or admin flow and it appears in these searches
// immediately, with no housing-specific publishing step.

import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Phone, MapPin, Inbox } from 'lucide-react'
import {
  HOUSING_SHORTCUTS,
  shortcutMapHref,
  housingShortcut,
  fetchHousingResources,
  matchesShortcut,
} from '@/lib/housing'
import { RESOURCE_TYPE_LABEL_KEY } from '@/lib/mapFilters'
import { useI18n } from '@/lib/i18n'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import Section from '@/components/ui/Section'
import Container from '@/components/ui/Container'
import ScamWarningLink from '@/components/housing/ScamWarningLink'

export default function HousingLandingPage() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const activeSlug = params.get('view')
  const active = activeSlug ? housingShortcut(activeSlug) : undefined

  // Housing resources INCLUDING the ones with no coordinates. /map cannot show
  // those — it requires is_map_ready and lat/lng — so a voucher programme or a
  // navigation service would have no browse path at all if this page only
  // linked out to the map. See fetchHousingResources().
  const { data: all, isLoading, isError, refetch } = useQuery({
    queryKey: ['housing-resources'],
    queryFn: fetchHousingResources,
    staleTime: 1000 * 60 * 5,
  })

  const results = (all ?? []).filter((r) => (active ? matchesShortcut(r, active) : true))

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Housing — Affordable, Vouchers, Second Chance — StreetRise"
        description="Find affordable apartments, Section 8 / Housing Choice Voucher help, transitional and supportive housing, and places that consider people with a criminal record."
        path="/housing"
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Housing', path: '/housing' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          {t('housing.page.title')}
        </h1>
        <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
          {t('housing.page.intro')}
        </p>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300">
          {t('housing.page.noAccount')}
        </p>
      </Section>

      <Section containerSize="wide" tone="gray" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('housing.page.shortcutsHeading')}
        </h2>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOUSING_SHORTCUTS.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => setParams(activeSlug === s.slug ? {} : { view: s.slug })}
                aria-pressed={activeSlug === s.slug}
                className={`flex h-full w-full items-start gap-3 rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                  activeSlug === s.slug
                    ? 'border-primary-600 bg-primary-50 dark:bg-slate-800'
                    : 'border-slate-200 bg-white hover:border-primary-600 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{s.icon}</span>
                <span>
                  <span className="block text-base font-semibold text-slate-900 dark:text-white">
                    {t(s.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-base text-slate-600 dark:text-slate-400">
                    {t(s.descriptionKey)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-6">
          <Link
            to={active ? shortcutMapHref(active) : '/map?category=housing'}
            className="inline-flex items-center gap-1 text-base font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            {t('housing.page.viewOnMap')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>

        {/* Results. Rendered here rather than only on /map because listings
            with no coordinates cannot appear there at all. */}
        <div className="mt-8">
          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}
            </div>
          )}

          {!isLoading && isError && (
            <div role="alert" className="rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
              <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
                {t('housing.page.loadFailed')}
              </p>
              <button type="button" onClick={() => refetch()} className="btn-secondary btn-sm mt-3">
                {t('resourceDetail.retry')}
              </button>
            </div>
          )}

          {!isLoading && !isError && results.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
              <Inbox className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-base text-slate-700 dark:text-slate-300">
                {t('housing.page.noResults')}
              </p>
            </div>
          )}

          {!isLoading && !isError && results.length > 0 && (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/resources/${r.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{r.name}</p>
                    <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
                      {r.resource_type ? t(RESOURCE_TYPE_LABEL_KEY[r.resource_type] ?? r.resource_type) : null}
                      {r.city ? ` · ${r.city}${r.state ? `, ${r.state}` : ''}` : null}
                    </p>
                    {/* Keyed on access_type, NOT on missing coordinates.
                        Those are different facts: a listing awaiting geocoding
                        has no lat/lng and a perfectly real front door, while a
                        phone-intake programme can keep its office coordinates.
                        Testing the coordinates would label real addresses as
                        "no walk-in" and stay silent on some that genuinely
                        are. */}
                    {['phone_intake', 'web_intake', 'confidential_address'].includes(r.access_type) && (
                      <p className="mt-1 flex items-center gap-1 text-base text-slate-500 dark:text-slate-400">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('housing.page.noWalkIn')}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* The distinction this whole feature turns on. Someone who does not have
          a voucher and someone who holds one need opposite searches, and
          "Section 8" is the same phrase for both. */}
      <Section containerSize="prose" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('housing.page.voucherHeading')}
        </h2>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300">
          {t('housing.page.voucherBody')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/map?housing=voucher-help" className="btn-secondary btn-sm">
            {t('housing.shortcut.voucherHelp.label')}
          </Link>
          <Link to="/map?housing=voucher-friendly" className="btn-secondary btn-sm">
            {t('housing.shortcut.voucherFriendly.label')}
          </Link>
        </div>
      </Section>

      <Container size="prose">
        <ScamWarningLink className="mb-8" />
      </Container>

      <Section containerSize="prose" className="pt-0 pb-12">
        <p className="flex items-start gap-2 text-base text-slate-600 dark:text-slate-400">
          <Phone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{t('housing.page.emptyNote')}</span>
        </p>
      </Section>
    </div>
  )
}
