import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Eye, EyeOff, MapPin, CheckCircle, Clock } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { Resource } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  verified:  'badge-verified',
  pending:   'badge-pending',
  rejected:  'badge bg-red-50 text-red-700',
  suspended: 'badge bg-gray-100 text-gray-500',
}

const CATEGORY_LABEL: Record<string, string> = {
  shelter: '🏠 Shelter', food: '🍽 Food', work_exchange: '🤝 Work Exchange',
  mental_health: '💙 Mental Health', medical: '⚕️ Medical', legal: '⚖️ Legal',
  hygiene: '🚿 Hygiene', clothing: '👕 Clothing', childcare: '👶 Childcare',
  transportation: '🚌 Transportation', other: '📍 Other',
}

export default function ProviderListings() {
  const { providerId } = useAuthStore()
  const toast          = useToast()
  const qc             = useQueryClient()

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ['provider-resources', providerId],
    queryFn: async () => {
      const { data } = await db.resources().select('*').eq('provider_id', providerId!).order('created_at', { ascending: false })
      return (data ?? []) as Resource[]
    },
    enabled: !!providerId,
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.resources().update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? 'Listing activated' : 'Listing hidden')
      qc.invalidateQueries({ queryKey: ['provider-resources'] })
    },
    onError: (e: Error) => toast.error('Failed to update', e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{resources.length} resource{resources.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/portal/listings/new" className="btn-primary btn-sm gap-1.5">
          <Plus size={16} /> Add Listing
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full" />)}
        </div>
      )}

      {!isLoading && resources.length === 0 && (
        <div className="card border-2 border-dashed border-gray-200 text-center py-16">
          <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 mb-1">No listings yet</p>
          <p className="text-sm text-gray-500 mb-4">Create your first resource listing to appear on the map.</p>
          <Link to="/portal/listings/new" className="btn-primary">Create first listing</Link>
        </div>
      )}

      <div className="space-y-3">
        {resources.map(r => (
          <div key={r.id} className={clsx('card transition-opacity', !r.is_active && 'opacity-60')}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <span className={STATUS_BADGE[r.verification_status] ?? 'badge'}>
                    {r.verification_status === 'verified'
                      ? <><CheckCircle size={11} className="inline mr-1" />Verified</>
                      : r.verification_status === 'pending'
                      ? <><Clock size={11} className="inline mr-1" />Pending review</>
                      : r.verification_status}
                  </span>
                  {!r.is_active && <span className="badge bg-gray-100 text-gray-500">Hidden</span>}
                </div>
                <p className="text-sm text-gray-500">
                  {CATEGORY_LABEL[r.category] ?? r.category}
                  {' · '}{r.address.city}, {r.address.state}
                </p>
                {r.beds_total != null && (
                  <p className="text-xs text-gray-400 mt-1">
                    {r.beds_available ?? '?'} / {r.beds_total} beds available
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive.mutate({ id: r.id, is_active: !r.is_active })}
                  className="btn-icon text-gray-400 hover:text-gray-600"
                  title={r.is_active ? 'Hide listing' : 'Show listing'}
                >
                  {r.is_active ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <Link to={`/portal/listings/${r.id}`} className="btn-secondary btn-sm gap-1">
                  <Pencil size={14} /> Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
