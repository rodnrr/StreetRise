// ============================================================
// /housing/:state — the primary SEO surface
// ============================================================
//
// Everything published in one state, grouped by city, with that state's
// record-lookback summary at the top.
//
// The lookback summary leads rather than trailing the listings because
// it changes how somebody reads every listing under it. Knowing that no
// state law caps how far back a Florida landlord may look is the
// difference between "why do they all say call to ask" and "of course
// they do".

import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Scale, Inbox } from 'lucide-react'
import { fetchState, fetchProgramsByState } from '@/lib/housing'
import { ProgramCard, ScamWarningLink, LoadFailed } from '@/components/housing/HousingBits'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import NotFoundPage from '@/pages/NotFoundPage'
import Section from '@/components/ui/Section'
import Container from '@/components/ui/Container'
import type { HousingProgramWithOrg } from '@/types'

/** Group by the city the program's own address sits in, within this state. */
function groupByCity(programs: HousingProgramWithOrg[], stateCode: string) {
  const groups = new Map<string, HousingProgramWithOrg[]>()

  for (const p of programs) {
    const inState = p.locations.filter((l) => l.state_code === stateCode)
    // An org with several addresses in one state appears under each city
    // it actually operates in — a Tampa resident should not have to
    // notice a listing filed under Jacksonville.
    const cities = Array.from(
      new Set(inState.map((l) => l.city).filter((c): c is string => !!c))
    )
    const keys = cities.length > 0 ? cities : ['Statewide and other locations']
    for (const key of keys) {
      const list = groups.get(key) ?? []
      list.push(p)
      groups.set(key, list)
    }
  }

  return Array.from(groups.entries()).sort(([a], [b]) => {
    // The catch-all bucket sorts last; everything else alphabetically.
    if (a.startsWith('Statewide')) return 1
    if (b.startsWith('Statewide')) return -1
    return a.localeCompare(b)
  })
}

export default function HousingStatePage() {
  const { state: stateParam } = useParams<{ state: string }>()
  const code = (stateParam ?? '').toUpperCase()
  const isValidShape = /^[A-Z]{2}$/.test(code)

  const { data: state, isLoading: stateLoading } = useQuery({
    queryKey: ['housing-state', code],
    queryFn: () => fetchState(code),
    enabled: isValidShape,
    staleTime: 1000 * 60 * 60,
  })

  const {
    data: programs,
    isLoading: programsLoading,
    isError: programsFailed,
    refetch: refetchPrograms,
  } = useQuery({
    queryKey: ['housing-state-programs', code],
    queryFn: () => fetchProgramsByState(code),
    enabled: isValidShape,
    staleTime: 1000 * 60 * 5,
  })

  const grouped = useMemo(
    () => groupByCity(programs ?? [], code),
    [programs, code]
  )

  if (!isValidShape) return <NotFoundPage />
  if (!stateLoading && !state) return <NotFoundPage />

  const name = state?.name ?? code
  const total = programs?.length ?? 0

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title={`Housing for People With Criminal Records in ${name} — StreetRise`}
        description={
          `Free directory of ${name} housing programs that consider people with criminal records — ` +
          `transitional housing, sober living, and reentry programs, listed by city.`
        }
        path={`/housing/${code.toLowerCase()}`}
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Housing after a record', path: '/housing' },
            { name, path: `/housing/${code.toLowerCase()}` },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-4">
        <Link
          to="/housing"
          className="inline-flex items-center gap-1 text-base text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All states
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          Housing with a record in {name}
        </h1>

        <p className="mt-3 text-lg text-slate-700 dark:text-slate-300">
          {stateLoading || programsLoading
            ? 'Loading…'
            : programsFailed
              ? 'We could not load the listings for this state.'
              : total === 0
                ? `We do not have confirmed listings in ${name} yet.`
                : total === 1
                  ? `1 program we have checked in ${name}.`
                  : `${total} programs we have checked in ${name}.`}
        </p>
      </Section>

      {/* ── What the law says here ── */}
      {state?.record_lookback_summary && (
        <Container size="prose">
          <section
            aria-labelledby="lookback-heading"
            className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start gap-3">
              <Scale className="mt-1 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              <div>
                <h2 id="lookback-heading" className="text-xl font-bold text-slate-900 dark:text-white">
                  How far back can a {name} landlord look?
                </h2>
                {state.record_lookback_summary.split('\n\n').map((para, i) => (
                  <p key={i} className="mt-3 text-base text-slate-800 dark:text-slate-200">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </section>
        </Container>
      )}

      <Container size="prose">
        <ScamWarningLink className="mb-8" />
      </Container>

      {/* ── Listings, grouped by city ── */}
      <Container size="prose">
        {programsLoading && (
          <div className="space-y-4 pb-12">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-64" />)}
          </div>
        )}

        {!programsLoading && programsFailed && (
          <div className="pb-12">
            <LoadFailed what={`listings for ${name}`} onRetry={() => refetchPrograms()} />
          </div>
        )}

        {!programsLoading && !programsFailed && total === 0 && (
          <section className="pb-12">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800">
              <Inbox className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                Nothing confirmed in {name} yet
              </h2>
              <p className="mx-auto mt-2 max-w-prose text-base text-slate-700 dark:text-slate-300">
                We would rather show you nothing than send you to a program we have not
                checked. Here is what works in the meantime:
              </p>
              <ul className="mx-auto mt-4 max-w-prose space-y-2 text-left text-base text-slate-800 dark:text-slate-200">
                <li>
                  <strong>Call 211.</strong> Free, 24 hours, anywhere in the country. Ask
                  for reentry housing in your county.
                </li>
                <li>
                  <strong>Ask your probation or parole officer.</strong> They keep a list of
                  approved housing and are expected to help you with a housing plan.
                </li>
                <li>
                  <strong>Ask the jail or prison reentry coordinator</strong> before release,
                  if you still can. They can refer you directly.
                </li>
              </ul>
            </div>
          </section>
        )}

        {!programsLoading && grouped.length > 0 && (
          <div className="space-y-10 pb-12">
            {grouped.map(([city, list]) => (
              <section key={city} aria-labelledby={`city-${city.replace(/\W+/g, '-')}`}>
                <h2
                  id={`city-${city.replace(/\W+/g, '-')}`}
                  className="text-2xl font-bold text-slate-900 dark:text-white"
                >
                  {city}
                </h2>
                <div className="mt-4 space-y-4">
                  {list.map((p) => (
                    <ProgramCard
                      key={`${city}-${p.id}`}
                      program={p}
                      organization={p.organization}
                      locations={p.locations.filter((l) => l.state_code === code)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
