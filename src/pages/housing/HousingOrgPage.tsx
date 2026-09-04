// ============================================================
// /housing/org/:slug — organization detail
// ============================================================
//
// Every program the org runs, where the information came from, and when
// it was last confirmed.
//
// The source attribution block is not decoration. A directory that
// tells somebody "this program takes felony records" and cannot say
// where that claim came from is asking to be trusted on nothing; naming
// the source lets a reader — or a caseworker — check it.

import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, MapPin } from 'lucide-react'
import { fetchOrgBySlug, formatAddress, ORG_TYPE_LABELS } from '@/lib/housing'
import { ProgramCard, ScamWarningLink, ContactLines, LoadFailed } from '@/components/housing/HousingBits'
import SeoHead, { SITE_URL } from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import NotFoundPage from '@/pages/NotFoundPage'
import Section from '@/components/ui/Section'
import Container from '@/components/ui/Container'
import type { HousingOrganization, HousingLocation } from '@/types'

/**
 * schema.org for the organization.
 *
 * Typed as the generic `Organization`, deliberately not `LocalBusiness`:
 * these are mostly nonprofits and several have no walk-in address at
 * all, and a LocalBusiness with no real storefront is a claim we cannot
 * support. Addresses are emitted only where we actually hold one.
 */
function orgSchema(org: HousingOrganization, locations: HousingLocation[]) {
  const withStreet = locations.filter((l) => l.address_line1 || l.city)

  return {
    '@context': 'https://schema.org',
    '@type': org.org_type === 'landlord' ? 'Organization' : 'NGO',
    name: org.name,
    url: `${SITE_URL}/housing/org/${org.slug}`,
    ...(org.description ? { description: org.description } : {}),
    ...(org.website ? { sameAs: [org.website] } : {}),
    ...(org.phone ? { telephone: org.phone } : {}),
    ...(org.email ? { email: org.email } : {}),
    ...(withStreet.length > 0
      ? {
          address: withStreet.map((l) => ({
            '@type': 'PostalAddress',
            ...(l.address_line1 ? { streetAddress: l.address_line1 } : {}),
            ...(l.city ? { addressLocality: l.city } : {}),
            ...(l.state_code ? { addressRegion: l.state_code } : {}),
            ...(l.postal_code ? { postalCode: l.postal_code } : {}),
            addressCountry: 'US',
          })),
        }
      : {}),
  }
}

export default function HousingOrgPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['housing-org', slug],
    queryFn: () => fetchOrgBySlug(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <Section containerSize="prose">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton mt-4 h-64" />
      </Section>
    )
  }

  // A failed request is not a missing organization. Rendering 404 on an
  // outage tells somebody the place they were sent to does not exist.
  if (isError) {
    return (
      <Section containerSize="prose">
        <LoadFailed what="this organization" onRetry={() => refetch()} />
      </Section>
    )
  }

  if (!data) return <NotFoundPage />

  const { organization: org, locations, programs, sources } = data
  const primary = locations.find((l) => l.is_primary) ?? locations[0]
  const stateCode = primary?.state_code ?? null

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title={`${org.name} — Housing With a Record — StreetRise`}
        description={
          org.description?.slice(0, 155) ??
          `${org.name} — ${ORG_TYPE_LABELS[org.org_type]} listed in the StreetRise second-chance housing directory.`
        }
        path={`/housing/org/${org.slug}`}
      >
        <script type="application/ld+json">
          {JSON.stringify(orgSchema(org, locations))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Housing after a record', path: '/housing' },
            ...(stateCode ? [{ name: stateCode, path: `/housing/${stateCode.toLowerCase()}` }] : []),
            { name: org.name, path: `/housing/org/${org.slug}` },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-4">
        <Link
          to={stateCode ? `/housing/${stateCode.toLowerCase()}` : '/housing'}
          className="inline-flex items-center gap-1 text-base text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {stateCode ? `Back to ${stateCode}` : 'All states'}
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          {org.name}
        </h1>

        <p className="mt-2 flex items-center gap-2 text-base text-slate-700 dark:text-slate-300">
          <Building2 className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          {ORG_TYPE_LABELS[org.org_type]}
        </p>

        {org.description && (
          <p className="mt-4 text-base text-slate-800 dark:text-slate-200">{org.description}</p>
        )}

        <ContactLines phone={org.phone} website={org.website} />

        {locations.length > 0 && (
          <section aria-labelledby="locations-heading" className="mt-6">
            <h2 id="locations-heading" className="text-xl font-bold text-slate-900 dark:text-white">
              {locations.length === 1 ? 'Location' : 'Locations'}
            </h2>
            <ul className="mt-2 space-y-2">
              {locations.map((l) => {
                const line = formatAddress(l)
                if (!line) return null
                return (
                  <li key={l.id} className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="text-base text-slate-800 dark:text-slate-200">{line}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </Section>

      <Container size="prose">
        <ScamWarningLink className="mb-8" />
      </Container>

      <Container size="prose">
        <section aria-labelledby="programs-heading" className="pb-8">
          <h2 id="programs-heading" className="text-2xl font-bold text-slate-900 dark:text-white">
            {programs.length === 1 ? 'Program' : 'Programs'}
          </h2>

          {programs.length === 0 ? (
            <p className="mt-3 text-base text-slate-700 dark:text-slate-300">
              We do not have confirmed program details for this organization yet. Call them
              directly to ask what housing they run and who they can take.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {programs.map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  organization={org}
                  locations={locations}
                  showOrgLink={false}
                />
              ))}
            </div>
          )}
        </section>
      </Container>

      {/* ── Where this came from ── */}
      {sources.length > 0 && (
        <Container size="prose">
          <section
            aria-labelledby="sources-heading"
            className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <h2 id="sources-heading" className="text-xl font-bold text-slate-900 dark:text-white">
              Where this information came from
            </h2>
            <ul className="mt-3 space-y-3">
              {sources.map((s) => (
                <li key={s.id} className="text-base text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{s.source_name}</span>
                  {s.source_url && (
                    <>
                      {' — '}
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="break-all text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
                      >
                        {s.source_url.replace(/^https?:\/\//, '')}
                      </a>
                    </>
                  )}
                  <span className="block text-slate-600 dark:text-slate-400">
                    Retrieved {new Date(s.retrieved_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                    {s.license_note ? ` · ${s.license_note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      )}
    </div>
  )
}
