import { supabase } from '@/lib/supabase'

/**
 * Claim notification emails, sent by the `notify-claim` edge function.
 *
 * Every call here is **best effort and must never block or fail the action
 * that triggered it.** A claim that was written to the database succeeded,
 * whether or not the email went out; surfacing a mail error as a failed claim
 * would be worse than sending nothing, because the user would retry an action
 * that already worked.
 *
 * The function itself decides what may be sent — the client passes only a
 * claim id and an event name, and the function re-reads every fact and
 * re-checks authorization server-side. Nothing here is trusted.
 *
 * Returns the outcome so callers can log it, but never throws.
 */
export type NotifyResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'already_sent' | 'send_failed' | 'error' }

export async function notifyClaim(
  claimId: string,
  event: 'submitted' | 'approved' | 'denied',
): Promise<NotifyResult> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-claim', {
      body: { claimId, event },
    })
    if (error) {
      console.warn('[notify-claim] invoke failed', event, error.message)
      return { sent: false, reason: 'error' }
    }
    return (data as NotifyResult) ?? { sent: false, reason: 'error' }
  } catch (e) {
    console.warn('[notify-claim] unreachable', event, e)
    return { sent: false, reason: 'error' }
  }
}
