import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Search } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { Provider, VerificationStatus } from '@/types'

const STATUS_STYLE: Record<string, string> = {
  pending:   'badge-pending',
  verified:  'badge-verified',
  rejected:  'badge bg-red-900/30 text-red-400',
  suspended: 'badge bg-gray-700 text-gray-400',
}

export default function AdminProviders() {
  const [filter, setFilter] = useState<VerificationStatus | 'all'>('pending')
  const [search, setSearch] = useState('')
  const { userId }          = useAuthStore()
  const toast               = useToast()
  const qc                  = useQueryClient()

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ['admin-providers', filter],
    queryFn: async () => {
      let q = db.providers().select('*').order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('verification_status', filter)
      const { data } = await q
      return (data ?? []) as Provider[]
    },
  })

  const moderate = useMutation({
    mutationFn: async ({ providerId, status, reason }: { providerId: string; status: VerificationStatus; reason?: string }) => {
      const { error: pErr } = await db.providers().update({ verification_status: status }).eq('id', providerId)
      if (pErr) throw pErr
      await db.moderation_logs().insert({
        admin_id:    userId!,
        target_type: 'provider',
        target_id:   providerId,
        action:      status === 'verified' ? 'approved' : status === 'rejected' ? 'rejected' : 'suspended',
        reason:      reason ?? null,
      })
    },
    onSuccess: (_, { status }) => {
      toast.success(`Provider ${status}`)
      qc.invalidateQueries({ queryKey: ['admin-providers'] })
      qc.invalidateQueries({ queryKey: ['admin-stats-providers'] })
    },
    onError: (e: Error) => toast.error('Action failed', e.message),
  })

  const filtered = providers.filter(p =>
    !search || p.organization_name.toLowerCase().includes(search.toLowerCase()) ||
    p.contact_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Providers</h1>
        <p className="text-sm text-gray-400 mt-0.5">Review and verify organization accounts</p>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {(['pending','verified','rejected','suspended','all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`badge py-1.5 px-3 cursor-pointer capitalize transition-colors text-xs ${
                filter === s ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 flex-1">
          <Search size={15} className="text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none w-full"
          />
        </div>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full bg-gray-800" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <AlertTriangle size={28} className="mx-auto mb-2 text-gray-600" />
          <p>No providers match this filter</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-gray-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-white">{p.organization_name}</h3>
                  <span className={STATUS_STYLE[p.verification_status] ?? 'badge'}>{p.verification_status}</span>
                </div>
                <p className="text-sm text-gray-400">{p.contact_name} · {p.contact_email}</p>
                {p.contact_phone && <p className="text-xs text-gray-500">{p.contact_phone}</p>}
                {p.ein && <p className="text-xs text-gray-500">EIN: {p.ein}</p>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-xs text-primary-400 hover:underline mt-1">
                    <ExternalLink size={11} /> {p.website}
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-500 shrink-0">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>

            {p.bio && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.bio}</p>}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {p.verification_status !== 'verified' && (
                <button
                  onClick={() => moderate.mutate({ providerId: p.id, status: 'verified' })}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-success-600 hover:bg-success-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  <CheckCircle size={13} /> Verify
                </button>
              )}
              {p.verification_status !== 'rejected' && (
                <button
                  onClick={() => {
                    const reason = prompt('Reason for rejection (optional):')
                    moderate.mutate({ providerId: p.id, status: 'rejected', reason: reason ?? undefined })
                  }}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-danger-600 hover:bg-danger-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  <XCircle size={13} /> Reject
                </button>
              )}
              {p.verification_status === 'verified' && (
                <button
                  onClick={() => moderate.mutate({ providerId: p.id, status: 'suspended' })}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  Suspend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
