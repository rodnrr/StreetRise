import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, supabase } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import { isConversationUnread, markConversationRead } from '@/lib/conversations'
import { requireProviderId, messagingErrorMessage, SessionExpiredError } from '@/lib/auth'
import { MessageSquare, Plus, X, Search, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import type { Conversation, ConversationStatus } from '@/types'

type ConversationWithProvider = Conversation & { providers?: { organization_name: string } | null }

const STATUS_FILTERS: Array<{ key: 'all' | ConversationStatus; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'open',     label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed',   label: 'Closed' },
]

const STATUS_BADGE: Record<ConversationStatus, string> = {
  open:     'bg-blue-900/40 text-blue-300',
  resolved: 'bg-green-900/40 text-green-300',
  closed:   'bg-gray-700 text-gray-400',
}

export default function AdminChat() {
  const { clearAuth } = useAuthStore()
  const toast = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [providerSearch, setProviderSearch] = useState('')
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ConversationStatus>('all')

  // An expired session is not a failed message — it is a sign-in problem, and
  // the only thing that fixes it is signing in again. Anything else keeps the
  // draft on screen so the text the admin typed is not lost.
  function handleWriteError(title: string, err: Error) {
    if (err instanceof SessionExpiredError) {
      toast.error('Please sign in again', err.message)
      clearAuth()
      navigate(`/login?next=${encodeURIComponent('/admin/messages')}`)
      return
    }
    toast.error(title, err.message)
  }

  // Fetch all conversations for admin, joined with provider name so the
  // list is actually identifiable at a glance (previously only showed
  // the subject line, with no indication of which provider it was).
  // The !provider_id hint is required: conversations has two FKs to
  // providers (provider_id and admin_id), so a bare providers() embed is
  // ambiguous and PostgREST rejects the whole query.
  const { data: conversations, isLoading: conversationsLoading, isError: conversationsError } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const { data, error } = await db.conversations()
        .select('*, providers!provider_id(organization_name)')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ConversationWithProvider[]
    },
  })

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return []
      const { data, error } = await db.messages()
        .select('*')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!selectedConversationId,
  })

  // Fetch all providers for creating new conversation
  const { data: providers } = useQuery({
    queryKey: ['all-providers'],
    queryFn: async () => {
      const { data, error } = await db.providers().select('id, organization_name')
      if (error) throw error
      return data || []
    },
  })

  // Fetch selected conversation details
  const { data: selectedConversation } = useQuery({
    queryKey: ['conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null
      const { data, error } = await db.conversations()
        .select('*, providers!provider_id(organization_name)')
        .eq('id', selectedConversationId)
        .single()
      if (error) throw error
      return data as unknown as ConversationWithProvider
    },
    enabled: !!selectedConversationId,
  })

  // Fetch admin notes for selected conversation (admin-only)
  const { data: adminNotes } = useQuery({
    queryKey: ['conversation-admin-notes', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return []
      const { data, error } = await db.adminNotes()
        .select('*')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!selectedConversationId,
  })

  // ── Realtime: neither side previously saw incoming messages/status
  // changes without navigating away and back. Mirrors the pattern already
  // used for bed availability (subscribeToBedUpdates in lib/supabase.ts).
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
        queryClient.invalidateQueries({ queryKey: ['conversation-detail'] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
        const convId = (payload.new as { conversation_id: string }).conversation_id
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', convId] })
        queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  // Mark the selected conversation read on open (best-effort — see
  // markConversationRead's tolerance for migration 030 not being applied).
  useEffect(() => {
    if (!selectedConversationId) return
    markConversationRead(selectedConversationId, 'admin').then(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
    })
  }, [selectedConversationId, queryClient])

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!newSubject || !selectedProvider) {
        throw new Error('Subject and provider are required')
      }
      // Resolved from the session, never from the persisted auth store —
      // see currentProviderId() for why the store is not proof we can write.
      const adminId = await requireProviderId()
      const { data: conversationData, error: convError } = await db.conversations().insert({
        provider_id: selectedProvider,
        admin_id: adminId,
        subject: newSubject,
        description: null,
        created_by_admin: true,
        status: 'open',
      }).select()
      if (convError) throw new Error(messagingErrorMessage(convError))
      if (!conversationData || conversationData.length === 0) throw new Error('Failed to create conversation')

      // Create separate admin note if provided
      if (newDescription && conversationData[0].id) {
        const { error: noteError } = await db.adminNotes().insert({
          conversation_id: conversationData[0].id,
          admin_id: adminId,
          notes: newDescription,
        })
        if (noteError) throw new Error(messagingErrorMessage(noteError))
      }
    },
    onSuccess: () => {
      toast.success('Conversation created', 'You can now send messages to this provider')
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
      setNewSubject('')
      setNewDescription('')
      setSelectedProvider('')
      setProviderSearch('')
      setShowNewConversation(false)
    },
    onError: (err: Error) => {
      handleWriteError('Failed to create conversation', err)
    },
  })

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!messageText.trim() || !selectedConversationId) return
      const adminId = await requireProviderId()
      const { error } = await db.messages().insert({
        conversation_id: selectedConversationId,
        sender_id: adminId,
        message: messageText.trim(),
        is_admin: true,
      })
      if (error) throw new Error(messagingErrorMessage(error))
      // Claim the thread so the provider can see who's responding
      if (selectedConversation && !selectedConversation.admin_id) {
        await db.conversations()
          .update({ admin_id: adminId })
          .eq('id', selectedConversationId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
      setMessageText('')
    },
    onError: (err: Error) => {
      handleWriteError('Failed to send message', err)
    },
  })

  // Change conversation status — the schema/RLS already supported this
  // (see migration 015's comment: "mark resolved/closed"), there was just
  // never any UI control for it.
  const setStatus = useMutation({
    mutationFn: async (status: ConversationStatus) => {
      if (!selectedConversationId) return
      const { error } = await db.conversations().update({ status }).eq('id', selectedConversationId)
      if (error) throw error
    },
    onSuccess: (_data, status) => {
      toast.success(`Conversation marked ${status}`)
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConversationId] })
    },
    onError: (err: Error) => toast.error('Failed to update status', err.message),
  })

  const filteredConversations = useMemo(() => {
    if (!conversations) return []
    const q = searchQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.subject.toLowerCase().includes(q) ||
        (c.providers?.organization_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [conversations, searchQuery, statusFilter])

  const filteredProviders = useMemo(() => {
    if (!providers) return []
    const q = providerSearch.trim().toLowerCase()
    if (!q) return providers
    return providers.filter((p) => p.organization_name.toLowerCase().includes(q))
  }, [providers, providerSearch])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Messages</h1>
          <p className="text-sm text-gray-400 mt-0.5">Provider communication & support</p>
        </div>
        <button
          onClick={() => setShowNewConversation(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Message
        </button>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Start New Conversation</h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Provider</label>
                <input
                  type="text"
                  placeholder="Search providers…"
                  value={selectedProvider ? providers?.find(p => p.id === selectedProvider)?.organization_name ?? '' : providerSearch}
                  onChange={e => { setProviderSearch(e.target.value); setSelectedProvider('') }}
                  className="input w-full mb-1.5"
                />
                {providerSearch && !selectedProvider && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-600 bg-gray-700">
                    {filteredProviders.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2">No matching providers</p>
                    ) : (
                      filteredProviders.slice(0, 20).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedProvider(p.id); setProviderSearch('') }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-600"
                        >
                          {p.organization_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="label">Subject</label>
                <input
                  type="text"
                  placeholder="e.g., Resource verification, booking issue"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">Admin Notes (optional, protected)</label>
                <textarea
                  placeholder="Internal triage notes. Only admins can view—never shared with provider."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={3}
                  className="input w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createConversation.mutate()}
                  disabled={createConversation.isPending || !selectedProvider}
                  className="btn-primary flex-1"
                >
                  {createConversation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] md:pb-0 pb-24">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-gray-800 rounded-2xl p-4 overflow-y-auto border border-gray-700 flex flex-col">
          <h2 className="font-semibold text-white mb-3">Conversations</h2>

          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search subject or provider…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input bg-gray-700 border-gray-600 text-white pl-8 text-sm"
            />
          </div>

          <div className="flex gap-1 mb-3">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={clsx('flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors', {
                  'bg-primary-600 text-white': statusFilter === key,
                  'bg-gray-700 text-gray-400 hover:bg-gray-600': statusFilter !== key,
                })}
              >
                {label}
              </button>
            ))}
          </div>

          {conversationsLoading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : conversationsError ? (
            <div className="text-red-400 text-sm">Couldn't load conversations. Refresh to try again.</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-gray-400 text-sm">No conversations match.</div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {filteredConversations.map(conv => {
                const unread = isConversationUnread(conv, 'admin')
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={clsx('w-full text-left p-3 rounded-lg transition-colors text-sm', {
                      'bg-primary-600 text-white': selectedConversationId === conv.id,
                      'bg-gray-700 text-gray-300 hover:bg-gray-600': selectedConversationId !== conv.id,
                    })}
                  >
                    <div className="flex items-center gap-1.5">
                      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-400" />}
                      <div className="font-medium truncate flex-1">{conv.subject}</div>
                    </div>
                    <div className="text-xs opacity-75 mt-1 truncate">
                      {conv.providers?.organization_name ?? 'Unknown provider'}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-60">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </span>
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full capitalize', STATUS_BADGE[conv.status])}>
                        {conv.status}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Message View */}
        <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-4 flex flex-col border border-gray-700">
          {selectedConversationId ? (
            <>
              {/* Header */}
              <div className="pb-4 border-b border-gray-700 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">{selectedConversation?.subject}</h2>
                    <p className="text-xs text-gray-400">
                      {selectedConversation?.providers?.organization_name}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {selectedConversation?.status !== 'resolved' && (
                      <button
                        onClick={() => setStatus.mutate('resolved')}
                        disabled={setStatus.isPending}
                        title="Mark resolved"
                        className="btn-icon bg-green-900/40 text-green-300 hover:bg-green-900/60"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {selectedConversation?.status !== 'closed' && (
                      <button
                        onClick={() => setStatus.mutate('closed')}
                        disabled={setStatus.isPending}
                        title="Close"
                        className="btn-icon bg-gray-700 text-gray-300 hover:bg-gray-600"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    {selectedConversation?.status !== 'open' && (
                      <button
                        onClick={() => setStatus.mutate('open')}
                        disabled={setStatus.isPending}
                        title="Reopen"
                        className="btn-icon bg-blue-900/40 text-blue-300 hover:bg-blue-900/60"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {selectedConversation?.description && (
                  <div className="bg-gray-700/50 rounded p-3 text-xs text-gray-300 border-l-2 border-gray-600">
                    <p className="text-gray-400 font-medium mb-1">Context provided by provider:</p>
                    <p>{selectedConversation.description}</p>
                  </div>
                )}
                {adminNotes && adminNotes.length > 0 && (
                  <div className="bg-blue-900/40 rounded p-3 text-xs text-blue-100 border-l-2 border-blue-600">
                    <p className="text-blue-300 font-medium mb-1">📝 Admin Notes (Internal Only):</p>
                    {adminNotes.map(note => (
                      <p key={note.id} className="mb-1 last:mb-0">{note.notes}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
                {messagesLoading ? (
                  <div className="text-gray-400 text-sm">Loading messages…</div>
                ) : messages?.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-8">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                    No messages yet
                  </div>
                ) : (
                  messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg text-sm ${
                          msg.is_admin
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message…"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage.mutate()
                      }
                    }}
                    className="input flex-1"
                  />
                  <button
                    onClick={() => sendMessage.mutate()}
                    disabled={sendMessage.isPending || !messageText.trim()}
                    className="btn-primary px-4"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
