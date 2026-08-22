import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, MapPin, Search, Pencil, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { Resource, VerificationStatus } from '@/types'

type ResourceWithProvider = Resource & { providers?: { organization_name: string } }

export default function AdminResources() {
  const [filter, setFilter] = useState<VerificationStatus | 'all'>('pending')
  const [search, setSearch] = useState('')
  const { userId }          = useAuthStore()
  const toast               = useToast()
  const qc                  = useQueryClient()

  const { data: resources = [], isLoading } = useQuery<ResourceWithProvider[]>({
    queryKey: ['admin-resources', filter],
    queryFn: async () => {
      let q = db.resources()
        .select('*, providers(organization_name)')
        .order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('verification_status', filter)
      const { data } = await q
      return (data ?? []) as unknown as ResourceWithProvider[]
    },
  })

  const moderate = useMutation({
    mutationFn: async ({ resourceId, status }: { resourceId: string; status: VerificationStatus }) => {
      const { error } = await db.resources().update({ verification_status: status }).eq('id', resourceId)
      if (error) throw error
      await db.moderation_logs().insert({
        admin_id:    userId!,
        target_type: 'resource',
        target_id:   resourceId,
        action:      status === 'verified' ? 'approved' : 'rejected',
        reason:      null,
      })
    },
    onSuccess: (_, { status }) => {
      toast.success(`Resource ${status}`)
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      qc.invalidateQueries({ queryKey: ['admin-stats-resources'] })
    },
    onError: (e: Error) => toast.error('Action failed', e.message),
  })

  const filtered = resources.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.address?.city?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const AVAIL_STYLE: Record<string, string> = {
    available: 'text-green-400', limited: 'text-yellow-400',
    full: 'text-red-400', unknown: 'text-gray-500', closed: 'text-gray-500'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Resources</h1>
          <p className="text-sm text-gray-400 mt-0.5">Review and verify resource listings</p>
        </div>
        <Link to="/admin/resources/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Resource
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['pending','verified','rejected','all'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`badge py-1.5 px-3 cursor-pointer capitalize text-xs transition-colors ${
                filter === s ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 flex-1">
          <Search size={15} className="text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city…"
            className="bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none w-full" />
        </div>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full bg-gray-800" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <MapPin size={28} className="mx-auto mb-2 text-gray-600" />
          <p>No resources match this filter</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-gray-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-white">{r.name}</h3>
                  <span className="badge bg-gray-700 text-gray-300 capitalize">{r.category.replace('_',' ')}</span>
                  <span className={`text-xs font-medium ${AVAIL_STYLE[r.availability_status]}`}>
                    ● {r.availability_status}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {r.providers?.organization_name ?? 'Unknown provider'} · {r.address?.city ?? 'No city'}, {r.address?.state ?? '—'}
                </p>
                {r.beds_total != null && (
                  <p className="text-xs text-gray-500 mt-0.5">{r.beds_available ?? '?'} / {r.beds_total} beds</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/admin/resources/${r.id}`} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors">
                  <Pencil size={11} /> Edit
                </Link>
                <Link to={`/resources/${r.id}`} className="text-xs text-primary-400 hover:underline">View →</Link>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{r.description}</p>

            <div className="flex gap-2">
              {r.verification_status !== 'verified' && (
                <button
                  onClick={() => moderate.mutate({ resourceId: r.id, status: 'verified' })}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-success-600 hover:bg-success-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  <CheckCircle size={13} /> Approve
                </button>
              )}
              {r.verification_status !== 'rejected' && (
                <button
                  onClick={() => moderate.mutate({ resourceId: r.id, status: 'rejected' })}
                  disabled={moderate.isPending}
                  className="flex items-center gap-1.5 bg-danger-600 hover:bg-danger-500 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors"
                >
                  <XCircle size={13} /> Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
