import { Link } from 'react-router-dom'
import { ArrowRight, Heart, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'

const CATEGORIES = [
  { label: 'Shelter',        emoji: '🏠', cat: 'shelter' },
  { label: 'Food',           emoji: '🍽', cat: 'food' },
  { label: 'Parks & Day Use', emoji: '🌳', cat: 'outdoor_space' },
  { label: 'Hygiene',        emoji: '🚿', cat: 'hygiene' },
  { label: 'Mental Health',  emoji: '💙', cat: 'mental_health' },
  { label: 'Medical',        emoji: '⚕️', cat: 'medical' },
  { label: 'Legal Help',     emoji: '⚖️', cat: 'legal' },
  { label: 'All Resources',  emoji: '📍', cat: '' },
]

export default function HomePage() {
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
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(113,231,197,0.25),transparent_45%)]" />
        <div className="relative mx-auto max-w-md">
          <p className="text-sm text-primary-200 mb-6 tracking-wide">Real-time resources. Real hope.</p>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Street<span className="text-primary-300">Rise</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-10">
            Find nearby shelter, meals, hygiene access, parks, and essential resources when you need them most.
          </p>
          <Link
            to="/map"
            className="inline-flex w-full items-center justify-between rounded-full bg-primary-300 px-6 py-4 text-lg font-semibold text-slate-900 shadow-lg shadow-primary-900/30"
          >
            Find Resources Near Me
            <ArrowRight size={22} />
          </Link>
        </div>
      </section>

      {/* Resource directory */}
      <section className="rounded-t-[2rem] bg-slate-50 text-slate-900 px-5 py-6 min-h-[52vh]">
        <div className="mx-auto max-w-md">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Tampa Bay Resources</h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              <MapPin size={14} />
              {isError ? 'Listings unavailable' : count != null ? `${count} listings` : 'Loading…'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ label, emoji, cat }) => (
              <Link
                key={label}
                to={cat ? `/map?category=${cat}` : '/map'}
                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-primary-300 transition-colors flex items-center gap-3 shadow-sm"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="font-semibold text-sm text-slate-800">{label}</span>
                <ArrowRight size={14} className="ml-auto text-slate-400" />
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Heart size={14} className="text-red-500" /> Free for everyone. No sign-up required.
          </div>
        </div>
      </section>
    </div>
  )
}
