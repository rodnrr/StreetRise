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

import { Link } from 'react-router-dom'
import { ArrowRight, Phone } from 'lucide-react'
import { HOUSING_SHORTCUTS, shortcutMapHref } from '@/lib/housing'
import { useI18n } from '@/lib/i18n'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import Section from '@/components/ui/Section'
import Container from '@/components/ui/Container'
import ScamWarningLink from '@/components/housing/ScamWarningLink'

export default function HousingLandingPage() {
  const { t } = useI18n()

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
              <Link
                to={shortcutMapHref(s)}
                className="flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-600 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
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
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6">
          <Link
            to="/map?category=housing"
            className="inline-flex items-center gap-1 text-base font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            {t('housing.page.allHousing')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>
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
