import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'

/**
 * Every admin-scoped query key starts with this prefix. The global mutation
 * rule in `main.tsx` invalidates anything matching it, which is what keeps the
 * sidebar badges and the dashboard stats in agreement after a write.
 */
export const ADMIN_QUERY_PREFIX = 'admin'

export const ADMIN_COUNTS_KEY = ['admin-counts']

export type AdminCounts = {
  providersPending: number
  claimsPending: number
  resourcesPending: number
  bookingsPending: number
  messagesOpen: number
  workCandidatesPending: number
}

export const EMPTY_ADMIN_COUNTS: AdminCounts = {
  providersPending: 0,
  claimsPending: 0,
  resourcesPending: 0,
  bookingsPending: 0,
  messagesOpen: 0,
  workCandidatesPending: 0,
}

/**
 * Counts only — `head: true` sends no rows over the wire, just the exact count
 * in the Content-Range header. Cheap enough to run on every admin page load.
 */
async function fetchAdminCounts(): Promise<AdminCounts> {
  const [providers, claims, resources, bookings, messages, workCandidates] = await Promise.all([
    db.providers().select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    // Counted off `providers`, not `provider_claims` — the providers row is
    // what actually gates the org, and a claim row can be left behind if the
    // follow-up update failed. See AdminProviders for the same join.
    db.providers().select('id', { count: 'exact', head: true }).eq('claim_status', 'pending_claim'),
    db.resources().select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    db.bookings().select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.conversations().select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.work_candidates().select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return {
    providersPending: providers.count ?? 0,
    claimsPending: claims.count ?? 0,
    resourcesPending: resources.count ?? 0,
    bookingsPending: (bookings as { count: number | null }).count ?? 0,
    messagesOpen: messages.count ?? 0,
    workCandidatesPending: workCandidates.count ?? 0,
  }
}

export function useAdminCounts(enabled = true) {
  return useQuery<AdminCounts>({
    queryKey: ADMIN_COUNTS_KEY,
    queryFn: fetchAdminCounts,
    staleTime: 1000 * 30,
    enabled,
  })
}
