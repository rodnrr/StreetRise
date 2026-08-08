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