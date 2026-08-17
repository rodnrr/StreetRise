import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useMapStore } from '@/lib/store'
import {
  GENDER_POLICY_LABEL,
  POPULATION_FOCUS_LABEL,
  TOGGLE_DEFS,
  DISTANCE_OPTIONS_MI,
  isUsefulOption,
  countActiveRefinements,
  type FacetCounts,
  type ToggleDef,
  type ToggleKey,
} from '@/lib/mapFilters'
import { milesToKm } from '@/lib/geo'
import type { GenderPolicy } from '@/types'

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
    </div>
  )
}

/** A toggle row that always states how many results it would leave. */
function ToggleRow({
  label, count, checked, onChange,
}: {
  label: string
  count: number
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-2">
      <span className="text-sm text-gray-700 flex-1">
        {label}
        <span className="text-gray-400 font-normal"> · {count}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1',
          checked ? 'bg-primary-600' : 'bg-gray-200',
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  )
}

function Pill({
  label, count, active, onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'badge text-sm py-1.5 px-3 transition-colors',
        active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      )}
    >
      {label}
      <span className={active ? 'text-white/70' : 'text-gray-400'}> {count}</span>
    </button>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  counts: FacetCounts
  /** True when we know where to measure distance from. */
  hasOrigin: boolean
}

export default function FilterDrawer({ open, onClose, counts, hasOrigin }: Props) {
  const { filters, setFilters, clearRefinements } = useMapStore()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const activeCount = countActiveRefinements(filters)

  // An option only appears when picking it would change the results. That is
  // what retires filters the data cannot support (nothing is tagged
  // pet-friendly; every row already says no call is needed) instead of leaving
  // them on screen doing nothing.
  const visibleToggles = (group: ToggleDef['group']) =>
    TOGGLE_DEFS.filter((def) => {
      if (def.group !== group) return false
      if (filters[def.key]) return true
      return isUsefulOption(counts.toggles[def.key] ?? 0, counts.base.toggles[def.key] ?? 0)
    })

  const toggleGender = (gp: GenderPolicy) => {
    const current = filters.genderPolicy ?? []
    const next = current.includes(gp) ? current.filter((v) => v !== gp) : [...current, gp]
    setFilters({ genderPolicy: next.length ? next : undefined })
  }

  const togglePopulation = (tag: string) => {
    const current = filters.populationFocus ?? []
    const next = current.includes(tag) ? current.filter((v) => v !== tag) : [...current, tag]
    setFilters({ populationFocus: next.length ? next : undefined })
  }

  const genderOptions = (Object.keys(GENDER_POLICY_LABEL) as GenderPolicy[]).filter(
    (gp) =>
      gp !== 'unknown' &&
      (filters.genderPolicy?.includes(gp) ||
        isUsefulOption(counts.genderPolicy[gp] ?? 0, counts.base.genderPolicy)),
  )

  const populationOptions = Object.keys(POPULATION_FOCUS_LABEL).filter(
    (tag) =>
      filters.populationFocus?.includes(tag) ||
      isUsefulOption(counts.populationFocus[tag] ?? 0, counts.base.populationFocus),
  )

  // Same rule as the toggles: a radius that reaches everything is the same as
  // "any distance", so only the ones that genuinely cut the list are offered.
  const distanceOptions = DISTANCE_OPTIONS_MI.filter(
    (mi) =>
      filters.radius === milesToKm(mi) ||
      isUsefulOption(counts.distance[String(mi)] ?? 0, counts.distance.any ?? 0),
  )

  const accessToggles   = visibleToggles('access')
  const facilityToggles = visibleToggles('facility')
  const trustToggles    = visibleToggles('trust')

  const nothingToRefine =
    !accessToggles.length && !facilityToggles.length && !trustToggles.length &&
    !genderOptions.length && !populationOptions.length &&
    (!hasOrigin || distanceOptions.length < 2)

  const section = (
    key: string,
    title: string,
    note: string | undefined,
    toggles: ToggleDef[],
    grid = false,
  ) =>
    toggles.length > 0 && (
      <section key={key} className="mb-5">
        <SectionHeader title={title} note={note} />
        <div className={clsx(grid && 'grid grid-cols-1 sm:grid-cols-2 gap-x-5')}>
          {toggles.map((def) => (
            <ToggleRow
              key={def.key}
              label={def.label}
              count={counts.toggles[def.key] ?? 0}
              checked={!!filters[def.key]}
              onChange={(v) => setFilters({ [def.key]: v || undefined } as Partial<Record<ToggleKey, boolean>>)}
            />
          ))}
        </div>
      </section>
    )

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={clsx(
          'fixed z-[75] bg-white shadow-2xl flex flex-col animate-slide-up',
          'inset-x-0 bottom-0 rounded-t-3xl max-h-[86dvh]',
          'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[32rem]',
          'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:max-h-[85dvh]',
        )}
      >
        <div className="bottom-sheet-handle shrink-0 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Narrow it down</h2>
          <div className="flex gap-1 items-center">
            {activeCount > 0 && (
              <button onClick={clearRefinements} className="text-sm text-danger-600 font-medium px-2">
                Reset
              </button>
            )}
            <button onClick={onClose} className="btn-icon text-gray-500" aria-label="Close filters">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {nothingToRefine && (
            <p className="text-sm text-gray-500 py-6 text-center">
              No further filters would change these results. Try a different need
              or a wider search area.
            </p>
          )}

          {/* Distance */}
          {hasOrigin && distanceOptions.length > 0 && (
            <section className="mb-5">
              <SectionHeader title="Distance" note="Measured from your location or the map centre." />
              <div className="flex flex-wrap gap-2">
                <Pill
                  label="Any distance"
                  count={counts.distance.any ?? 0}
                  active={filters.radius == null}
                  onClick={() => setFilters({ radius: undefined })}
                />
                {distanceOptions.map((mi) => {
                  const km = milesToKm(mi)
                  return (
                    <Pill
                      key={mi}
                      label={`${mi} mi`}
                      count={counts.distance[String(mi)] ?? 0}
                      active={filters.radius != null && Math.abs(filters.radius - km) < 0.01}
                      onClick={() => setFilters({ radius: km })}
                    />
                  )
                })}
              </div>
            </section>
          )}

          {section('access', 'Getting in', 'Conditions to meet before you arrive.', accessToggles)}
          {section('facility', 'What they have', undefined, facilityToggles, true)}

          {/* Eligibility */}
          {(genderOptions.length > 0 || populationOptions.length > 0) && (
            <section className="mb-5">
              <SectionHeader
                title="Who they serve"
                note="Listings with unrecorded eligibility always stay visible."
              />
              <div className="flex flex-wrap gap-2">
                {genderOptions.map((gp) => (
                  <Pill
                    key={gp}
                    label={GENDER_POLICY_LABEL[gp]}
                    count={counts.genderPolicy[gp] ?? 0}
                    active={!!filters.genderPolicy?.includes(gp)}
                    onClick={() => toggleGender(gp)}
                  />
                ))}
              </div>
              {populationOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {populationOptions.map((tag) => (
                    <Pill
                      key={tag}
                      label={POPULATION_FOCUS_LABEL[tag] ?? tag}
                      count={counts.populationFocus[tag] ?? 0}
                      active={!!filters.populationFocus?.includes(tag)}
                      onClick={() => togglePopulation(tag)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {section('trust', 'Trust', undefined, trustToggles)}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="btn-primary w-full">
            {counts.total === 0
              ? 'No matches — adjust filters'
              : `Show ${counts.total} ${counts.total === 1 ? 'place' : 'places'}`}
          </button>
        </div>
      </div>
    </>
  )
}
