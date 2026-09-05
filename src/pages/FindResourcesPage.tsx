import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import { useI18n } from '@/lib/i18n'
import Section from '@/components/ui/Section'

const FIND_DESTINATIONS = [
  { to: '/shelters',       labelKey: 'home.category.shelter',        emoji: '🏠' },
  { to: '/housing',        labelKey: 'category.housing',             emoji: '🏘️' },
  { to: '/food-pantries',  labelKey: 'home.category.food',           emoji: '🍽️' },
  { to: '/hygiene',        labelKey: 'home.category.hygiene',        emoji: '🚿' },
  { to: '/medical',        labelKey: 'home.category.medical',        emoji: '⚕️' },
  { to: '/transportation', labelKey: 'home.category.transportation', emoji: '🚌' },
] as const

/**
 * The public Find hub.
 *
 * Find is the umbrella navigation concept; the map is one discovery tool inside
 * it. Specialized experiences such as Housing and Transportation live here as
 * peers with the ordinary category pages rather than being flattened into map
 * filters. That matters for resources that are phone/service-area based or
 * deliberately have no public coordinates.
 */
export default function FindResourcesPage() {
  const { t } = useI18n()

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Find Help — StreetRise"
        description="Find shelter, housing, food, hygiene, medical care, transportation and other verified community resources through StreetRise."
        path="/find"
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Find Resources', path: '/find' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="wide" className="pb-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
            {t('nav.findResources')}
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            {t('home.browseByNeed')}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIND_DESTINATIONS.map(({ to, labelKey, emoji }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex h-full min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="text-3xl" aria-hidden="true">{emoji}</span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t(labelKey)}
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 text-base font-semibold text-primary-700 underline hover:text-primary-800 dark:text-primary-300"
          >
            <MapPin className="h-5 w-5" aria-hidden="true" />
            {t('housing.page.viewOnMap')}
          </Link>
        </div>
      </Section>
    </div>
  )
}
