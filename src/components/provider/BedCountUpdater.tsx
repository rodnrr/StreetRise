import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BedDouble, Minus, Plus, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { Resource, AvailabilityStatus } from '@/types'

function deriveStatus(available: number, total: number): AvailabilityStatus {
  if (available === 0)              return 'full'
  if (available / total <= 0.25)   return 'limited'
  return 'available'
}

export default function BedCountUpdater({ resource }: { resource: Resource }) {
  const [beds, setBeds]     = useState(resource.beds_available ?? 0)
  const [saving, setSaving] = useState(false)
  const total               = resource.beds_total ?? 0
  const toast               = useToast()
  const qc                  = useQueryClient()

  async function save(newBeds: number) {
    setSaving(true)
    const status = deriveStatus(newBeds, total)
    const now = new Date().toISOString()
    const { error } = await db.resources()
      .update({
        beds_available:     newBeds,
        availability_status: status,
        beds_updated_at:    now,
        // A provider actively updating bed counts is a real freshness signal —
        // getTrustInfo() (mapFilters.ts) reads last_provider_update_at, not
        // beds_updated_at, so without this the "May be outdated" label could
        // never clear no matter how often a provider checks in.
        last_provider_update_at: now,
      })
      .eq('id', resource.id)
    if (error) {
      toast.error('Failed to update', error.message)
    } else {
      toast.success('Bed count updated', `${newBeds} / ${total} beds available`)
      qc.invalidateQueries({ queryKey: ['provider-resources'] })
    }
    setSaving(false)
  }

  const pct    = total > 0 ? Math.round((beds / total) * 100) : 0
  const status = deriveStatus(beds, total)

  const barColor = {
    available: 'bg-available',
    limited:   'bg-limited',
    full:      'bg-full',
    unknown:   'bg-unknown',
    closed:    'bg-gray-300',
  }[status]

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{resource.name}</p>
          <p className="text-xs text-gray-500">{resource.address.city}, {resource.address.state}</p>
        </div>
        <span className={clsx('badge ml-2 shrink-0', {
          'badge-available': status === 'available',
          'badge-limited':   status === 'limited',
          'badge-full':      status === 'full',
        })}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Counter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBeds(b => Math.max(0, b - 1))}
            disabled={beds <= 0 || saving}
            className="btn-icon bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <div className="text-center min-w-[60px]">
            <span className="text-2xl font-bold text-gray-900">{beds}</span>
            <span className="text-gray-400 text-sm"> / {total}</span>
          </div>
          <button
            onClick={() => setBeds(b => Math.min(total, b + 1))}
            disabled={beds >= total || saving}
            className="btn-icon bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-1">
          <BedDouble size={13} />
          {pct}% available
        </div>

        <button
          onClick={() => save(beds)}
          disabled={beds === resource.beds_available || saving}
          className="btn-primary btn-sm gap-1.5 disabled:opacity-40"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
          {saving ? 'Saving…' : 'Update'}
        </button>
      </div>
    </div>
  )
}
