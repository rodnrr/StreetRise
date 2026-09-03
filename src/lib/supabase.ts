import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env.local and fill in your project values.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export const db = {
  resources:        () => supabase.from('resources'),
  providers:        () => supabase.from('providers'),
  // Generated types lag the bookings columns (see docs/OPEN_ITEMS.md);
  // remove the cast once database.types.ts is regenerated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookings:         () => supabase.from('bookings') as any,
  work_exchanges:   () => supabase.from('work_exchanges'),
  work_candidates:  () => supabase.from('work_exchange_candidates'),
  faq:              () => supabase.from('faq'),
  blog_posts:       () => supabase.from('blog_posts'),
  moderation_logs:  () => supabase.from('moderation_logs'),
  donations:        () => supabase.from('donation_campaigns'),
  conversations:    () => supabase.from('conversations'),
  messages:         () => supabase.from('conversation_messages'),
  adminNotes:       () => supabase.from('conversation_admin_notes'),
  provider_claims:  () => supabase.from('provider_claims'),
  // Static GTFS tables (migrations 042/043). Cast for the same reason as
  // `bookings` above: database.types.ts is hand-maintained and does not yet
  // describe these tables, and regenerating it against live is forbidden
  // while live lags the repo's migrations (see CLAUDE.md). The row shapes
  // are declared in src/lib/transit.ts instead, which is where every read
  // of them goes through.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transit_stops:    () => supabase.from('transit_stops') as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transit_routes:   () => supabase.from('transit_routes') as any,
  /**
   * Nearest-neighbour stop lookup (migration 042). An RPC rather than a
   * table read because ordering by distance has to happen where all the
   * candidate rows are — see the function's own comment in that migration.
   */
  nearestTransitStop: (lat: number, lng: number, radiusKm: number, agency: string | null) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('nearest_transit_stop', {
      in_lat: lat, in_lng: lng, in_radius_km: radiusKm, in_agency: agency,
    }),
}

export function subscribeToBedUpdates(
  resourceIds: string[],
  onUpdate: (resourceId: string, bedsAvailable: number, status: string) => void
) {
  return supabase
    .channel('bed-availability')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'resources',
        filter: `id=in.(${resourceIds.join(',')})`,
      },
      (payload) => {
        const r = payload.new as { id: string; beds_available: number; availability_status: string }
        onUpdate(r.id, r.beds_available, r.availability_status)
      }
    )
    .subscribe()
}

export function subscribeToBookings(
  userId: string,
  onUpdate: (booking: Record<string, unknown>) => void
) {
  return supabase
    .channel(`bookings-user-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new as Record<string, unknown>)
    )
    .subscribe()
}