import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, SearchX } from 'lucide-react'
import { getCategoryPage, fetchCategoryResources, categoryMapLinkToSearch } from '@/lib/categories'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import NotFoundPage from '@/pages/NotFoundPage'

interface Props {
  slug: string
}

export default function CategoryPage({ slug }: Props) {
  const config = getCategoryPage(slug)

  const { data: resources, isLoading } = useQuery({
    queryKey: ['category-resources', slug],
    queryFn: () => fetchCategoryResources(config!.mapLink),
    enabled: !!config && config.mode === 'live',
    staleTime: 1000 * 60,
  })

  if (!config) return <NotFoundPage />

  const mapHref = `/map${categoryMapLinkToSearch(config.mapLink)}`

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title={`${config.displayName} — StreetRise`}
        description={config.description}
        path={`/${config.slug}`}
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: config.displayName, path: `/${config.slug}` },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-4 text-center">
        <span className="text-4xl">{config.emoji}</span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{config.displayName}</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{config.description}</p>
      </Section>

      {config.mode === 'live' ? (
        <Section containerSize="wide" className="pt-0">
          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}
            </div>
          )}

          {!isLoading && resources && resources.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="Nothing listed here yet"
              description="Nothing currently matches this need. Check the full map — new listings are added regularly."
              action={<Button to="/map">View Full Map</Button>}
            />
          )}

          {!isLoading && resources && resources.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {resources.map((r) => (
                  <Card<typeof Link> key={r.id} as={Link} to={`/resources/${r.id}`} hoverable className="block">
                    <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.address.street}, {r.address.city}, {r.address.state} {r.address.zip}
                    </p>
                    {r.description && (
                      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                        {r.description}
                      </p>
                    )}
                    {/* These pages show the same public set as the map, which
                        includes community-listed rows. The badge is what keeps
                        that honest, and the referral note stops someone reading
                        an address as an invitation to turn up. */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={r.verification_status === 'verified' ? 'badge-verified' : 'badge-pending'}>
                        {r.verification_status === 'verified' ? 'Staff Verified' : 'Community Listed'}
                      </span>
                      {r.requires_referral && (
                        <span className="badge bg-amber-50 text-amber-700">Referral needed</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button to={mapHref} variant="secondary" className="gap-2">
                  View on Map <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
        </Section>
      ) : (
        <Section containerSize="prose" className="pt-0 text-center">
          <SectionHeading
            title="Not seeing enough listings?"
            subtitle="We're actively onboarding more providers in this category. In the meantime, search the full map — it includes resources that may still help even if they're not listed specifically here."
          />
          <Button to={mapHref} className="gap-2">
            Search the Map <ArrowRight size={16} />
          </Button>
        </Section>
      )}
    </div>
  )
}
