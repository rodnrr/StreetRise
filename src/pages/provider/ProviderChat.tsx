import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/lib/store'
import { MessageSquare, Plus, X } from 'lucide-react'

export default function ProviderChat() {
  const { providerId } = useAuthStore()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [messageText, setMessageText] = useState('')

  if (!providerId) return <div className="text-gray-400">Not authenticated</div>

  // Fetch conversations for this provider
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['provider-conversations', providerId],
    queryFn: async () => {
      const { data, error } = await db.conversations()
        .select('*')
        .eq('provider_id', providerId)
        .order('updated_at', { ascending: false }) as any
      if (error) throw error
      return (data || []) as any[]
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
        .order('created_at', { ascending: true }) as any
      if (error) throw error
      return (data || []) as any[]
    },
    enabled: !!selectedConversationId,
  })

  // Fetch selected conversation details
  const { data: selectedConversation } = useQuery({
    queryKey: ['conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null
      const { data, error } = await db.conversations()
        .select('*')
        .eq('id', selectedConversationId)
        .single() as any
      if (error) throw error
      return data as any
    },
    enabled: !!selectedConversationId,
  })

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!newSubject) {
        throw new Error('Subject is required')
      }
      const { error } = await db.conversations().insert({
        provider_id: providerId,
        admin_id: null,
        subject: newSubject,
        description: newDescription,
        created_by_admin: false,
        status: 'open',
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Message sent', 'Our team will get back to you soon')
      queryClient.invalidateQueries({ queryKey: ['provider-conversations', providerId] })
      setNewSubject('')
      setNewDescription('')
      setShowNewConversation(false)
    },
    onError: (err: Error) => {
      toast.error('Failed to send message', err.message)
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
        is_admin: false,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['provider-conversations', providerId] })
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
          <h1 className="text-2xl font-bold text-gray-900">Support Messages</h1>
          <p className="text-sm text-gray-600 mt-0.5">Chat with our team about your account or resources</p>
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Message Our Team</h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Subject *</label>
                <input
                  type="text"
                  placeholder="e.g., Verification help, Technical issue"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Message (optional)</label>
                <textarea
                  placeholder="Tell us what you need…"
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
                  {createConversation.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 card border border-gray-200 p-4 overflow-y-auto">
          <h2 className="font-semibold text-gray-900 mb-3">Your Conversations</h2>
          {conversationsLoading ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : conversations?.length === 0 ? (
            <div className="text-gray-500 text-sm">No messages yet. Start one to reach our team.</div>
          ) : (
            <div className="space-y-2">
              {conversations?.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                    selectedConversationId === conv.id
                      ? 'bg-primary-50 text-primary-900 border border-primary-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="font-medium truncate">{conv.subject}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                  {conv.status !== 'open' && (
                    <div className="text-xs font-medium text-gray-400 mt-1 capitalize">
                      {conv.status}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message View */}
        <div className="lg:col-span-2 card border border-gray-200 p-4 flex flex-col">
          {selectedConversationId ? (
            <>
              {/* Header */}
              <div className="pb-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedConversation?.subject}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedConversation?.admin_id ? 'Admin team is responding' : 'Awaiting response'}
                    </p>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                    selectedConversation?.status === 'open'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {selectedConversation?.status}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {messagesLoading ? (
                  <div className="text-gray-500 text-sm">Loading messages…</div>
                ) : messages?.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                    Send your first message to start
                  </div>
                ) : (
                  messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg text-sm ${
                          msg.is_admin
                            ? 'bg-gray-100 text-gray-900 border border-gray-200'
                            : 'bg-primary-600 text-white'
                        }`}
                      >
                        {msg.is_admin && (
                          <p className="text-xs font-medium opacity-75 mb-1">StreetRise Team</p>
                        )}
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
              <div className="pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Reply…"
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
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p>Select a message thread to reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
