import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db, supabase } from '@/lib/supabase'

const CATEGORIES = [
  { label: 'Shelter',         emoji: '🏠', cat: 'shelter' },
  { label: 'Food',            emoji: '🍽️', cat: 'food' },
  { label: 'Hygiene',         emoji: '🚿', cat: 'hygiene' },
  { label: 'Medical',         emoji: '⚕️', cat: 'medical' },
  { label: 'Mental Health',   emoji: '💙', cat: 'mental_health' },
  { label: 'Legal Help',      emoji: '⚖️', cat: 'legal' },
  { label: 'Parks & Day Use', emoji: '🌳', cat: 'outdoor_space' },
  { label: 'All Resources',   emoji: '📍', cat: '' },
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

export default function HomePage() {
  const queryClient = useQueryClient()

  const { data: count, isError } = useQuery({
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

  return (
    <div className="bg-white text-slate-900">
      {/* ── Hero ── */}
      <section className="px-5 pt-10 pb-8 text-center">
        <div className="mx-auto max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-600">
            Real-time local resources
          </p>
          <h1 className="mb-3 text-3xl font-bold leading-tight">
            Find help near you, right now.
          </h1>
          <p className="mb-7 leading-relaxed text-slate-500">
            Shelter, food, hygiene, medical care, and more — updated by the
            organizations that provide them.
          </p>
          <Link
            to="/map"
            className="btn-primary btn-lg inline-flex w-full items-center justify-center gap-2"
          >
            Find Resources Near Me
            <ArrowRight size={20} />
          </Link>
          <p className="mt-3 text-xs text-slate-400">Free. No sign-up required.</p>
        </div>
      </section>

      {/* ── Live listings indicator ── */}
      {!isError && (
        <div className="px-5">
          <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {count != null ? `${count} live listings on the map` : 'Loading listings…'}
          </div>
        </div>
      )}

      {/* ── Where we're available ── */}
      <section className="px-5 pt-9">
        <div className="mx-auto max-w-md">
          <h2 className="mb-3 text-lg font-bold">Where StreetRise is available</h2>
          <ul className="space-y-2">
            {CITIES.map(({ name, live }) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
              >
                <span className="flex items-center gap-2 font-medium">
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
            <Link to="/provider/onboarding" className="font-medium text-primary-600 hover:underline">
              Partner with us
            </Link>
          </p>
        </div>
      </section>

      {/* ── Browse by need ── */}
      <section className="px-5 py-9">
        <div className="mx-auto max-w-md">
          <h2 className="mb-3 text-lg font-bold">Browse by need</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ label, emoji, cat }) => (
              <Link
                key={label}
                to={cat ? `/map?category=${cat}` : '/map'}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:border-primary-300"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-sm font-semibold text-slate-800">{label}</span>
                <ArrowRight size={14} className="ml-auto text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
