import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/lib/store'
import { MessageSquare, Plus, X } from 'lucide-react'
import type { Conversation } from '@/types'

type ConversationWithProvider = Conversation & { providers?: { organization_name: string } | null }

export default function AdminChat() {
  const { providerId } = useAuthStore()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [messageText, setMessageText] = useState('')

  // Fetch all conversations for admin
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const { data, error } = await db.conversations()
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
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
        .select('*, providers(organization_name)')
        .eq('id', selectedConversationId)
        .single()
      if (error) throw error
      return data as unknown as ConversationWithProvider
    },
    enabled: !!selectedConversationId,
  })

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!newSubject || !selectedProvider) {
        throw new Error('Subject and provider are required')
      }
      const { error } = await db.conversations().insert({
        provider_id: selectedProvider,
        admin_id: providerId,
        subject: newSubject,
        description: newDescription,
        created_by_admin: true,
        status: 'open',
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Conversation created', 'You can now send messages to this provider')
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
      setNewSubject('')
      setNewDescription('')
      setSelectedProvider('')
      setShowNewConversation(false)
    },
    onError: (err: Error) => {
      toast.error('Failed to create conversation', err.message)
    },
  })

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!messageText.trim() || !selectedConversationId) return
      const { error } = await db.messages().insert({
        conversation_id: selectedConversationId,
        sender_id: providerId,
        message: messageText.trim(),
        is_admin: true,
      })
      if (error) throw error
      // Claim the thread so the provider can see who's responding
      if (selectedConversation && !selectedConversation.admin_id) {
        await db.conversations()
          .update({ admin_id: providerId })
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
      toast.error('Failed to send message', err.message)
    },
  })

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
                <select
                  value={selectedProvider}
                  onChange={e => setSelectedProvider(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select a provider…</option>
                  {providers?.map(p => (
                    <option key={p.id} value={p.id}>{p.organization_name}</option>
                  ))}
                </select>
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
                <label className="label">Description (optional)</label>
                <textarea
                  placeholder="Add context…"
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
                  disabled={createConversation.isPending}
                  className="btn-primary flex-1"
                >
                  {createConversation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-gray-800 rounded-2xl p-4 overflow-y-auto border border-gray-700">
          <h2 className="font-semibold text-white mb-3">Conversations</h2>
          {conversationsLoading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : conversations?.length === 0 ? (
            <div className="text-gray-400 text-sm">No conversations yet</div>
          ) : (
            <div className="space-y-2">
              {conversations?.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                    selectedConversationId === conv.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium truncate">{conv.subject}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message View */}
        <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-4 flex flex-col border border-gray-700">
          {selectedConversationId ? (
            <>
              {/* Header */}
              <div className="pb-4 border-b border-gray-700">
                <h2 className="font-semibold text-white">{selectedConversation?.subject}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedConversation?.providers?.organization_name}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
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
