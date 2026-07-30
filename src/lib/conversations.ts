import { db } from '@/lib/supabase'
import type { Conversation } from '@/types'

export type ConversationSide = 'provider' | 'admin'

export function isConversationUnread(conv: Conversation, side: ConversationSide): boolean {
  if (!conv.last_message_at) return false
  const lastRead = side === 'provider' ? conv.provider_last_read_at : conv.admin_last_read_at
  if (!lastRead) return true
  return new Date(conv.last_message_at).getTime() > new Date(lastRead).getTime()
}

// Marking read is best-effort: a failure here should never break opening a
// conversation, so we surface it as a warning rather than throwing.
export async function markConversationRead(conversationId: string, side: ConversationSide) {
  const now = new Date().toISOString()
  const patch = side === 'provider'
    ? { provider_last_read_at: now }
    : { admin_last_read_at: now }
  const { error } = await db.conversations()
    .update(patch)
    .eq('id', conversationId)
  if (error) {
    console.warn(`Could not mark conversation read: ${error.message}`)
  }
}
