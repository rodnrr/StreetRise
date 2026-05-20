import { X } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import type { ResourceCategory, AvailabilityStatus } from '@/types'

const CATEGORIES: { value: ResourceCategory; label: string; emoji: string }[] = [
  { value: 'shelter',       label: 'Shelter',        emoji: '🏠' },
  { value: 'food',          label: 'Food',           emoji: '🍽' },
  { value: 'work_exchange', label: 'Work Exchange',  emoji: '🤝' },
  { value: 'mental_health', label: 'Mental Health',  emoji: '💙' },
  { value: 'medical',       label: 'Medical',        emoji: '⚕️' },
  { value: 'legal',         label: 'Legal',          emoji: '⚖️' },
  { value: 'hygiene',       label: 'Hygiene',        emoji: '🚿' },
  { value: 'clothing',      label: 'Clothing',       emoji: '👕' },
  { value: 'childcare',     label: 'Childcare',      emoji: '👶' },
  { value: 'transportation',label: 'Transportation', emoji: '🚌' },
]

const STATUSES: { value: AvailabilityStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited',   label: 'Limited' },
  { value: 'full',      label: 'Full' },
]


function formatImperialDistance(km: number) {
  const miles = km * 0.621371
  if (miles < 0.2) {
    return `${Math.round(miles * 5280)} ft`
  }
  return `${miles.toFixed(1)} mi`
}

interface Props {
  open:    boolean
  onClose: () => void
}

export default function FilterDrawer({ open, onClose }: Props) {
  const { filters, setFilters, clearFilters } = useMapStore()

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[40] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="bottom-sheet z-[45] max-h-[80vh] overflow-y-auto">
        <div className="bottom-sheet-handle" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 text-lg">Filters</h2>
            <div className="flex gap-2">
              {Object.keys(filters).length > 0 && (
                <button onClick={clearFilters} className="text-sm text-danger-600 font-medium">
                  Clear all
                </button>
              )}
              <button onClick={onClose} className="btn-icon text-gray-500">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Category */}
          <section className="mb-5">
            <h3 className="label mb-2">Category</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setFilters({ category: filters.category === value ? undefined : value })}
                  className={`badge text-sm py-1.5 px-3 transition-colors ${
                    filters.category === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </section>

          {/* Availability */}
          <section className="mb-5">
            <h3 className="label mb-2">Availability</h3>
            <div className="flex gap-2">
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilters({
                    availabilityStatus: filters.availabilityStatus === value ? undefined : value
                  })}
                  className={`badge text-sm py-1.5 px-3 transition-colors ${
                    filters.availabilityStatus === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Walk-ins / No ID */}
          <section className="mb-5 space-y-3">
            <h3 className="label">Requirements</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filters.walkInsOnly}
                onChange={(e) => setFilters({ walkInsOnly: e.target.checked || undefined })}
                className="w-4 h-4 accent-primary-600"
              />
              <span className="text-sm text-gray-700">Walk-ins accepted only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.requiresId === false}
                onChange={(e) => setFilters({ requiresId: e.target.checked ? false : undefined })}
                className="w-4 h-4 accent-primary-600"
              />
              <span className="text-sm text-gray-700">No ID required</span>
            </label>
          </section>

          {/* Radius */}
          <section className="mb-6">
            <h3 className="label mb-2">Search radius: {formatImperialDistance(filters.radius ?? 20)}</h3>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={filters.radius ?? 20}
              onChange={(e) => setFilters({ radius: parseInt(e.target.value) })}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatImperialDistance(1)}</span><span>{formatImperialDistance(50)}</span>
            </div>
          </section>

          <button onClick={onClose} className="btn-primary w-full">
            Show results
          </button>
        </div>
      </div>
    </>
  )
}
