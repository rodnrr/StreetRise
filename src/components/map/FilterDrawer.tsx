import { X } from 'lucide-react'
import clsx from 'clsx'
import { useMapStore } from '@/lib/store'
import { CATEGORY_EMOJI, CATEGORY_LABEL, GENDER_POLICY_LABEL, POPULATION_FOCUS_LABEL } from '@/lib/mapFilters'
import type { ResourceCategory, GenderPolicy } from '@/types'

// Categories shown in the drawer (omit work_exchange — has its own page)
const DRAWER_CATEGORIES: ResourceCategory[] = [
  'shelter', 'food', 'hygiene', 'healthcare', 'mental_health', 'substance_recovery',
  'legal_aid', 'employment', 'childcare', 'transportation', 'day_space', 'outreach', 'hotline',
]

const GENDER_POLICIES: GenderPolicy[] = [
  'gender_inclusive', 'men_only', 'women_only', 'family_only', 'couples_only', 'youth_only',
]

const POPULATION_TAGS: string[] = [
  'veterans', 'lgbtq', 'domestic_violence', 'families', 'seniors',
  'young_adults', 'pregnant_women', 'substance_recovery', 'reentry',
]

function formatDistance(km: number) {
  const miles = km * 0.621371
  return miles < 1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
}

interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}
function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1',
          checked ? 'bg-primary-600' : 'bg-gray-200',
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
            'transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  )
}

interface Props {
  open:    boolean
  onClose: () => void
}

export default function FilterDrawer({ open, onClose }: Props) {
  const { filters, setFilters, clearFilters } = useMapStore()

  if (!open) return null

  const toggleGenderPolicy = (gp: GenderPolicy) => {
    const current = filters.genderPolicy ?? []
    const next = current.includes(gp) ? current.filter((v) => v !== gp) : [...current, gp]
    setFilters({ genderPolicy: next.length ? next : undefined })
  }

  const togglePopFocus = (tag: string) => {
    const current = filters.populationFocus ?? []
    const next = current.includes(tag) ? current.filter((v) => v !== tag) : [...current, tag]
    setFilters({ populationFocus: next.length ? next : undefined })
  }

  const activeFilters = Object.keys(filters).filter(
    (k) => filters[k as keyof typeof filters] !== undefined
      && !(Array.isArray(filters[k as keyof typeof filters]) && (filters[k as keyof typeof filters] as unknown[]).length === 0)
  ).length

  return (
    <>
      <div className="fixed inset-0 z-[40] bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="bottom-sheet z-[45] max-h-[82vh] overflow-y-auto">
        <div className="bottom-sheet-handle" />

        <div className="p-4 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 text-lg">Filters</h2>
            <div className="flex gap-2 items-center">
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="text-sm text-danger-600 font-medium">
                  Clear all
                </button>
              )}
              <button onClick={onClose} className="btn-icon text-gray-500">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Category ── */}
          <section className="mb-5">
            <SectionHeader title="Category" />
            <div className="flex flex-wrap gap-2">
              {DRAWER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setFilters({
                      category:    filters.category === cat ? undefined : cat,
                      quickFilter: undefined,
                    })
                  }
                  className={clsx(
                    'badge text-sm py-1.5 px-3 transition-colors',
                    filters.category === cat && !filters.quickFilter
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
                </button>
              ))}
            </div>
          </section>

          {/* ── Eligibility ── */}
          <section className="mb-5">
            <SectionHeader title="Eligibility — who this resource serves" />
            <div className="flex flex-wrap gap-2">
              {GENDER_POLICIES.map((gp) => (
                <button
                  key={gp}
                  onClick={() => toggleGenderPolicy(gp)}
                  className={clsx(
                    'badge text-sm py-1.5 px-3 transition-colors',
                    filters.genderPolicy?.includes(gp)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {GENDER_POLICY_LABEL[gp]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {POPULATION_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => togglePopFocus(tag)}
                  className={clsx(
                    'badge text-sm py-1.5 px-3 transition-colors',
                    filters.populationFocus?.includes(tag)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {POPULATION_FOCUS_LABEL[tag] ?? tag}
                </button>
              ))}
            </div>
          </section>

          {/* ── Access ── */}
          <section className="mb-5">
            <SectionHeader title="Access" />
            <div className="divide-y divide-gray-50">
              <ToggleRow
                label="Open overnight"
                checked={!!filters.overnightAllowed}
                onChange={(v) => setFilters({ overnightAllowed: v || undefined })}
              />
              <ToggleRow
                label="Walk-ins accepted"
                checked={!!filters.walkInsOnly}
                onChange={(v) => setFilters({ walkInsOnly: v || undefined })}
              />
              <ToggleRow
                label="No call required before going"
                checked={!!filters.noCallRequired}
                onChange={(v) => setFilters({ noCallRequired: v || undefined })}
              />
              <ToggleRow
                label="No referral required"
                checked={!!filters.noReferralRequired}
                onChange={(v) => setFilters({ noReferralRequired: v || undefined })}
              />
              <ToggleRow
                label="No ID required"
                checked={!!filters.noIdRequired}
                onChange={(v) => setFilters({ noIdRequired: v || undefined })}
              />
            </div>
          </section>

          {/* ── Facilities ── */}
          <section className="mb-5">
            <SectionHeader title="Facilities & Amenities" />
            <div className="grid grid-cols-2 gap-x-4 divide-y divide-gray-50">
              <ToggleRow
                label="🚿 Showers"
                checked={!!filters.hasShowers}
                onChange={(v) => setFilters({ hasShowers: v || undefined })}
              />
              <ToggleRow
                label="🚻 Restrooms"
                checked={!!filters.hasRestrooms}
                onChange={(v) => setFilters({ hasRestrooms: v || undefined })}
              />
              <ToggleRow
                label="🍽️ Meals served"
                checked={!!filters.servesMeals}
                onChange={(v) => setFilters({ servesMeals: v || undefined })}
              />
              <ToggleRow
                label="🫧 Laundry"
                checked={!!filters.hasLaundry}
                onChange={(v) => setFilters({ hasLaundry: v || undefined })}
              />
              <ToggleRow
                label="🐾 Pets allowed"
                checked={!!filters.petFriendly}
                onChange={(v) => setFilters({ petFriendly: v || undefined })}
              />
              <ToggleRow
                label="♿ Wheelchair accessible"
                checked={!!filters.wheelchairAccessible}
                onChange={(v) => setFilters({ wheelchairAccessible: v || undefined })}
              />
              <ToggleRow
                label="🚌 Near public transit"
                checked={!!filters.nearTransit}
                onChange={(v) => setFilters({ nearTransit: v || undefined })}
              />
            </div>
          </section>

          {/* ── Trust / Freshness ── */}
          <section className="mb-5">
            <SectionHeader title="Trust & Freshness" />
            <div className="divide-y divide-gray-50">
              <ToggleRow
                label="Verified listings only"
                checked={!!filters.verifiedOnly}
                onChange={(v) => setFilters({ verifiedOnly: v || undefined })}
              />
              <ToggleRow
                label="Hide potentially outdated listings"
                checked={!!filters.hideStale}
                onChange={(v) => setFilters({ hideStale: v || undefined })}
              />
              <ToggleRow
                label="Show unconfirmed listings"
                checked={!!filters.showLowConfidence}
                onChange={(v) => setFilters({ showLowConfidence: v || undefined })}
              />
            </div>
          </section>

          {/* ── Search Radius ── */}
          <section className="mb-6">
            <SectionHeader title={`Search radius: ${formatDistance(filters.radius ?? 20)}`} />
            <input
              type="range"
              min={1}
              max={80}
              step={1}
              value={filters.radius ?? 20}
              onChange={(e) => setFilters({ radius: parseInt(e.target.value) })}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatDistance(1)}</span>
              <span>{formatDistance(80)}</span>
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
