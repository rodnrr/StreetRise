import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Search, ClipboardCheck, HeartHandshake, MessagesSquare, Heart } from 'lucide-react'
import clsx from 'clsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db, supabase } from '@/lib/supabase'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import SeoHead from '@/lib/seo/SeoHead'
import { organizationSchema } from '@/lib/seo/structuredData'
import type { Resource } from '@/types'

// "Browse by need" — categories with a dedicated marketing page link into it
// (better SEO + real content); the rest fall back to a pre-filtered /map link.
const CATEGORIES = [
  { label: 'Shelter',         emoji: '🏠', to: '/shelters' },
  { label: 'Food',            emoji: '🍽️', to: '/food-pantries' },
  { label: 'Hygiene',         emoji: '🚿', to: '/hygiene' },
  { label: 'Medical',         emoji: '⚕️', to: '/medical' },
  { label: 'Employment',      emoji: '💼', to: '/employment' },
  { label: 'Mental Health',   emoji: '💙', to: '/map?category=mental_health' },
  { label: 'Legal Help',      emoji: '⚖️', to: '/legal' },
  { label: 'Parks & Day Use', emoji: '🌳', to: '/map?category=outdoor_space' },
  { label: 'All Resources',   emoji: '📍', to: '/map' },
]

// Metros StreetRise serves. Set `live: true` ONLY when a metro has real,
// publicly visible listings seeded on the map — otherwise it reads as
// "Coming soon". (Verify with the public resources query before flipping.)
const CITIES = [
  { name: 'Tampa Bay',    live: true },
  { name: 'Orlando',      live: true },
  { name: 'Miami',        live: false },
  { name: 'Jacksonville', live: false },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Find',
    icon: Search,
    description: 'Search by what you need or your location. The map shows every verified resource in your city.',
  },
  {
    step: '02',
    title: 'Check',
    icon: ClipboardCheck,
    description: 'See real-time availability, hours, phone numbers, and directions. Always call ahead — availability changes fast.',
  },
  {
    step: '03',
    title: 'Get Help',
    icon: HeartHandshake,
    description: 'Call, walk in, or submit a request through the app. Shelters and services respond to requests and confirm spots.',
  },
]

function useResourceCount() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['resource-count'],
    queryFn: async () => {
      const { count: c, error } = await db.resources()
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('verification_status', ['verified', 'pending'])
        .eq('is_map_ready', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      if (error) throw error
      return c ?? 0
    },
    staleTime: 0,
  })

  useEffect(() => {
    const channel = supabase
      .channel('resource-count-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-count'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return query
}

// A handful of real, currently-live resources — not hardcoded examples, so this
// never goes stale or misrepresents what's actually on the map.
function useFeaturedResources() {
  return useQuery({
    queryKey: ['featured-resources'],
    queryFn: async () => {
      const { data, error } = await db.resources()
        .select('*')
        .eq('is_active', true)
        .eq('verification_status', 'verified')
        .eq('is_map_ready', true)
        .order('updated_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data ?? []) as unknown as Resource[]
    },
    staleTime: 1000 * 60,
  })
}

export default function HomePage() {
  const { data: count, isError } = useResourceCount()
  const { data: featured } = useFeaturedResources()

  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="StreetRise — Find Shelter, Food & Support Near You"
        description="A free app connecting people in Tampa Bay and Orlando to verified shelter, food, medical, and support resources — updated in real time by the organizations that provide them."
        path="/"
      >
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
      </SeoHead>

      {/* ── Hero ── */}
      <section className="px-5 pt-10 pb-8 text-center">
        <div className="mx-auto max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            Real-time local resources
          </p>
          <h1 className="mb-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white">
            Find Real Shelter, Food &amp; Support in Tampa Bay or Orlando
          </h1>
          <p className="mb-7 leading-relaxed text-slate-500 dark:text-slate-400">
            A free app that connects you to verified local resources — updated
            by the organizations that provide them.
          </p>
          <div className="flex flex-col gap-3">
            <Button to="/map" size="lg" fullWidth className="gap-2">
              Find Help
              <ArrowRight size={20} />
            </Button>
            <Button to="/donate" variant="secondary" size="lg" fullWidth className="gap-2">
              <Heart size={18} />
              Give Hope (Donate)
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Free. No sign-up required.</p>
        </div>
      </section>

      {/* ── Live listings indicator ── */}
      {!isError && (
        <div className="px-5">
          <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {count != null ? `${count} live listings on the map` : 'Loading listings…'}
          </div>
        </div>
      )}

      {/* ── Featured resources ── */}
      {featured && featured.length > 0 && (
        <Section tone="gray" containerSize="narrow">
          <SectionHeading eyebrow="Verified today" title="Real Resources in Your City" align="left" />
          <div className="space-y-3">
            {featured.map((r) => (
              <Card<typeof Link> key={r.id} hoverable as={Link} to={`/resources/${r.id}`} className="block">
                <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {r.address.street}, {r.address.city}, {r.address.state} {r.address.zip}
                </p>
                {r.description && (
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{r.description}</p>
                )}
              </Card>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button to="/map" variant="secondary">See All Resources</Button>
          </div>
        </Section>
      )}

      {/* ── How It Works ── */}
      <Section containerSize="narrow">
        <SectionHeading title="How It Works" align="left" />
        <div className="space-y-6">
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div key={step}>
              <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{step}</p>
              <p className="font-bold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Mission ── */}
      <Section tone="gray" containerSize="narrow">
        <SectionHeading title="Real Help for Real People" align="left" />
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          StreetRise was built for people experiencing homelessness, veterans,
          families in crisis, domestic violence survivors, people with
          disabilities, and anyone connecting them to care. This is not a
          directory of non-profits. This is a map of actual services — shelter
          beds, meals, showers, medical care, legal aid, and more — updated by
          the providers who deliver them.
        </p>
      </Section>

      {/* ── Where we're available ── */}
      <Section containerSize="narrow">
        <SectionHeading title="Where StreetRise is Available" align="left" />
        <ul className="space-y-2">
          {CITIES.map(({ name, live }) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-800"
            >
              <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <MapPin size={16} className="text-slate-400" />
                {name}, FL
              </span>
              <span className={clsx('badge', live ? 'badge-available' : 'badge-unknown')}>
                {live ? 'Live' : 'Coming soon'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-slate-400">
          Want StreetRise in your city?{' '}
          <Link to="/partner-with-us" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Partner with us
          </Link>
        </p>
      </Section>

      {/* ── Browse by need ── */}
      <Section tone="gray" containerSize="narrow">
        <SectionHeading title="Browse by Need" align="left" />
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map(({ label, emoji, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:border-primary-300 dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
              <ArrowRight size={14} className="ml-auto text-slate-300" />
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Community voices (no fabricated testimonials — honest empty state) ── */}
      <Section containerSize="narrow">
        <SectionHeading title="Community Voices" align="left" />
        <EmptyState
          icon={MessagesSquare}
          title="Stories are on the way"
          description="We're collecting real stories from the people and providers StreetRise has helped. Check back soon."
        />
      </Section>

      {/* ── Donate CTA ── */}
      <Section tone="primary" containerSize="narrow" className="text-center">
        <SectionHeading
          title="Help Us Reach More People"
          subtitle="Every dollar helps StreetRise verify more resources and expand to more Florida cities."
        />
        <Button to="/donate" size="lg" className="gap-2">
          <Heart size={18} />
          Give Hope (Donate)
        </Button>
      </Section>
    </div>
  )
}
