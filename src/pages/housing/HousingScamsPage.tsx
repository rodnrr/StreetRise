// ============================================================
// /housing/scams — how to spot a fake housing listing
// ============================================================
//
// Salvaged from PR #107, but rebuilt on StreetRise's own i18n and design
// system rather than shipping an English-only page.
//
// Two deliberate constraints on the copy:
//
//   1. Every rule is something the reader can DO. "Never send a deposit by
//      gift card" is usable; "be cautious of irregular payment requests" is
//      not.
//   2. Practical safety advice only — no legal claims. PR #107's state-law
//      summaries were unsourced and one of them was materially wrong about
//      the Fair Housing Act's exemptions. Nothing on this page asserts what
//      the law entitles anyone to.
//
// Static content on purpose: this page must work when the database is down,
// because it is the page that stops somebody losing money.

import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, XCircle, Flag } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import Section from '@/components/ui/Section'

const FLAG_KEYS = ['money', 'giftcard', 'guarantee', 'cheap', 'absent', 'rush', 'ssn', 'fee']
const GOOD_KEYS = ['call', 'upfront', 'visit', 'writing', 'honest']
const CHECK_KEYS = ['address', 'phone', 'mainline', 'map']
const AFTER_KEYS = ['bank', 'keep', 'ftc', 'police']

export default function HousingScamsPage() {
  const { t } = useI18n()

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="How to Spot a Fake Housing Listing — StreetRise"
        description="Housing scams target people who are in a hurry and short on options. Learn the warning signs, what a real program looks like, and what to do if you have already sent money."
        path="/housing/scams"
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Housing', path: '/housing' },
            { name: 'Spotting scams', path: '/housing/scams' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          {t('housing.scams.title')}
        </h1>
        <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
          {t('housing.scams.intro')}
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
            {t('housing.scams.oneRule')}
          </p>
        </div>
      </Section>

      <Section containerSize="prose" tone="gray" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('housing.scams.flagsHeading')}
        </h2>
        <ul className="mt-6 space-y-6">
          {FLAG_KEYS.map((k) => (
            <li key={k} className="flex items-start gap-3">
              <XCircle className="mt-1 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t(`housing.scams.flag.${k}.title`)}
                </h3>
                <p className="mt-1 text-base text-slate-800 dark:text-slate-200">
                  {t(`housing.scams.flag.${k}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section containerSize="prose" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('housing.scams.goodHeading')}
        </h2>
        <ul className="mt-4 space-y-3">
          {GOOD_KEYS.map((k) => (
            <li key={k} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-700 dark:text-green-400" aria-hidden="true" />
              <span className="text-base text-slate-800 dark:text-slate-200">
                {t(`housing.scams.good.${k}`)}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section containerSize="prose" tone="gray" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('housing.scams.checksHeading')}
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-base text-slate-800 dark:text-slate-200">
          {CHECK_KEYS.map((k) => <li key={k}>{t(`housing.scams.check.${k}`)}</li>)}
        </ol>
      </Section>

      <Section containerSize="prose" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('housing.scams.afterHeading')}
        </h2>
        <ul className="mt-4 space-y-3 text-base text-slate-800 dark:text-slate-200">
          {AFTER_KEYS.map((k) => (
            <li key={k} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
              <span>{t(`housing.scams.after.${k}`)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <Flag className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          <p className="text-base text-slate-800 dark:text-slate-200">
            <a href="mailto:Info@streetrise.org" className="font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400">
              Info@streetrise.org
            </a>
          </p>
        </div>

        <p className="mt-6 text-base text-slate-600 dark:text-slate-400">
          {t('housing.scams.notLegal')}
        </p>

        <p className="mt-6 text-base">
          <Link to="/housing" className="font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400">
            {t('housing.page.title')}
          </Link>
        </p>
      </Section>
    </div>
  )
}
