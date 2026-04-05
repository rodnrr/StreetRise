import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import type { WorkExchange } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  volunteering: 'badge bg-blue-50 text-blue-700',
  paid:         'badge bg-green-50 text-green-700',
  skills_trade: 'badge bg-purple-50 text-purple-700',
  internship:   'badge bg-yellow-50 text-yellow-700',
}

export default function ProviderWorkExchange() {
  const { providerId } = useAuthStore()
  const toast          = useToast()
  const qc             = useQueryClient()
  const navigate       = useNavigate()

  const { data: listings = [], isLoading } = useQuery<WorkExchange[]>({
    queryKey: ['provider-work-exchanges', providerId],
    queryFn: async () => {
      const { data } = await db.work_exchanges()
        .select('*').eq('provider_id', providerId!).order('created_at', { ascending: false })
      return (data ?? []) as unknown as WorkExchange[]
    },
    enabled: !!providerId,
  })

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.work_exchanges().update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Updated')
      qc.invalidateQueries({ queryKey: ['provider-work-exchanges'] })
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Exchange</h1>
          <p className="text-sm text-gray-500 mt-0.5">Volunteer, paid, and skills-trade opportunities</p>
        </div>
        <button onClick={() => navigate('/portal/work/new')} className="btn-primary btn-sm gap-1.5">
          <Plus size={16} /> Add Opportunity
        </button>
      </div>

      {isLoading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>}

      {!isLoading && listings.length === 0 && (
        <div className="card border-2 border-dashed border-gray-200 text-center py-14">
          <p className="text-2xl mb-2">🤝</p>
          <p className="font-semibold text-gray-900 mb-1">No work exchange listings yet</p>
          <p className="text-sm text-gray-500 mb-4">Post opportunities for volunteers, paid workers, or skills trades.</p>
          <button onClick={() => navigate('/portal/work/new')} className="btn-primary">Add first opportunity</button>
        </div>
      )}

      <div className="space-y-3">
        {listings.map(wx => (
          <div key={wx.id} className={`card ${!wx.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">{wx.title}</h3>
                  <span className={TYPE_STYLE[wx.exchange_type] ?? 'badge'}>{wx.exchange_type.replace('_',' ')}</span>
                  {!wx.is_active && <span className="badge bg-gray-100 text-gray-500">Hidden</span>}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{wx.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {wx.hours_per_week && <span className="text-xs text-gray-400">{wx.hours_per_week} hrs/week</span>}
                  {wx.compensation && <span className="text-xs text-gray-400">· {wx.compensation}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggle.mutate({ id: wx.id, is_active: !wx.is_active })}
                  className="btn-icon text-gray-400 hover:text-gray-600"
                >
                  {wx.is_active ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <button className="btn-secondary btn-sm gap-1">
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
