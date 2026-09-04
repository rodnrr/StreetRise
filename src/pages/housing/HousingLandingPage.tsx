// ============================================================
// /housing — second-chance housing directory landing
// ============================================================
//
// State picker first, because "where are you" is the only question that
// narrows this directory usefully, and a search box that returns
// nothing is worse than no search box.
//
// The picker shows every state, with a count next to the ones that have
// listings, rather than hiding the empty ones. Somebody in Ohio needs
// to find out we have nothing for Ohio in one tap — and be handed the
// national directories — not scan a list looking for a state that was
// silently omitted.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin } from 'lucide-react'
import { fetchStates, fetchStateCounts, stateSlug } from '@/lib/housing'
import { ScamWarningLink, LoadFailed } from '@/components/housing/HousingBits'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import Section from '@/components/ui/Section'
import Container from '@/components/ui/Container'

export default function HousingLandingPage() {
  const [query, setQuery] = useState('')

  const { data: states, isLoading, isError, refetch } = useQuery({
    queryKey: ['housing-states'],
    queryFn: fetchStates,
    staleTime: 1000 * 60 * 60,
  })

  const { data: counts } = useQuery({
    queryKey: ['housing-state-counts'],
    queryFn: fetchStateCounts,
    staleTime: 1000 * 60 * 5,
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return states ?? []
    return (states ?? []).filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q
    )
  }, [states, query])

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="Housing After a Criminal Record — StreetRise"
        description="A free directory of housing programs that will consider people with criminal records. Search by state. No account needed."
        path="/housing"
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Housing after a record', path: '/housing' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          Housing after a criminal record
        </h1>
        <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
          A record makes finding a place to live harder. It does not make it impossible.
          This is a free list of housing programs that will at least consider people with
          records.
        </p>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300">
          You do not need an account. We do not save what you search for. Pick your state
          to start.
        </p>
      </Section>

      <Container size="prose">
        <ScamWarningLink className="mb-8" />
      </Container>

      <Section containerSize="prose" tone="gray" className="py-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Find your state
        </h2>

        {/* A real <form> with a real <label>: this submits and is
            keyboard-reachable, and the filtering below is a progressive
            enhancement on top of a list that is already complete. */}
        <form
          className="mt-4"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="state-search" className="block text-base font-semibold text-slate-900 dark:text-white">
            Search for a state
          </label>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="state-search"
              type="search"
              name="state"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Florida, Texas, Ohio…"
              autoComplete="address-level1"
              className="input w-full py-3 pl-10 text-base"
            />
          </div>
        </form>

        {isLoading && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="mt-6">
            <LoadFailed what="the list of states" onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <p className="mt-6 text-base text-slate-700 dark:text-slate-300">
            No state matches “{query}”. Check the spelling, or clear the box to see all
            states.
          </p>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((s) => {
              const n = counts?.[s.code] ?? 0
              return (
                <li key={s.code}>
                  <Link
                    to={`/housing/${stateSlug(s.code)}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 hover:border-primary-600 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span
                      className={
                        n > 0
                          ? 'shrink-0 text-base font-semibold text-primary-600 dark:text-primary-400'
                          : 'shrink-0 text-base text-slate-500 dark:text-slate-400'
                      }
                    >
                      {n > 0 ? n : '—'}
                      <span className="sr-only">
                        {n > 0 ? ` listings` : ' no listings yet'}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-6 flex items-start gap-2 text-base text-slate-600 dark:text-slate-400">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            A dash means we have not added listings for that state yet. We are building this
            state by state and checking each program before it goes on the list.
          </span>
        </p>
      </Section>

      <Section containerSize="prose" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          If your state is empty
        </h2>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300">
          Call <strong>211</strong> from any phone, any time. It is free, and they keep
          local lists of housing and reentry help for every part of the country.
        </p>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-300">
          If you are on probation or parole, your officer is required to help you with a
          housing plan. Ask them for their list.
        </p>
      </Section>
    </div>
  )
}
