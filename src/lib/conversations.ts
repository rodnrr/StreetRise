import { db } from '@/lib/supabase'
import type { Conversation } from '@/types'

export type ConversationSide = 'provider' | 'admin'

export function isConversationUnread(conv: Conversation, side: ConversationSide): boolean {
  if (!conv.last_message_at) return false
  const lastRead = side === 'provider' ? conv.provider_last_read_at : conv.admin_last_read_at
  if (!lastRead) return true
  return new Date(conv.last_message_at).getTime() > new Date(lastRead).getTime()
}

// Tolerates migration 030 not being applied yet (provider_last_read_at /
// admin_last_read_at columns not existing in production) — logs and no-ops
// instead of throwing, so opening a conversation never breaks chat.
export async function markConversationRead(conversationId: string, side: ConversationSide) {
  const column = side === 'provider' ? 'provider_last_read_at' : 'admin_last_read_at'
  const { error } = await db.conversations()
    .update({ [column]: new Date().toISOString() } as never)
    .eq('id', conversationId)
  if (error) {
    console.warn(`Could not mark conversation read (migration 030 may not be applied yet): ${error.message}`)
  }
}
