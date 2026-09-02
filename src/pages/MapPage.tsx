import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import {
  Search, SlidersHorizontal, X, LocateFixed, Maximize2, AlertCircle, RotateCcw, Clock,
} from 'lucide-react'
import clsx from 'clsx'
import { useMapStore, useToast } from '@/lib/store'
import { subscribeToBedUpdates } from '@/lib/supabase'
import {
  fetchMapResources,
  filterResources,
  computeFacetCounts,
  activeFilterLabels,
  clearedFilter,
  countActiveRefinements,
  isUsefulOption,
  hasKnownHours,
  needForCategory,
  needForPopulationFocus,
  quickFilterToFilters,
  filterSignature,
  NEED_DEFS,
  NEED_ORDER,
  CATEGORY_SLUG_MAP,
} from '@/lib/mapFilters'
import { useI18n } from '@/lib/i18n'
import LangToggle from '@/components/shared/LangToggle'
import type { LatLng } from '@/lib/geo'
import type { NeedKey, QuickFilterKey } from '@/types'

import ResourceMarker from '@/components/map/ResourceMarker'
import ResourceCard from '@/components/map/ResourceCard'
import ResourceSheet from '@/components/map/ResourceSheet'
import FilterDrawer from '@/components/map/FilterDrawer'
import 'leaflet/dist/leaflet.css'

const MAX_AUTO_FIT_ZOOM = 14

interface FitRequest { points: LatLng[]; token: number }
interface FocusRequest { lat: number; lng: number; token: number }

/**
 * Bridges Leaflet and the Zustand store.
 *
 * Moves flow one way: `fit` and `focus` tokens drive the map, and every settled
 * view — programmatic or dragged — is reported back. Reporting programmatic
 * moves too is what keeps distances honest: after the map auto-fits to the
 * results, "2.3 mi" is measured from where the map actually ended up, not from
 * the stale centre it started at. There is no feedback loop because the store's
 * centre is only read once, as the map's initial view.
 */
function MapController({
  fit, focus, onMoved,
}: {
  fit: FitRequest | null
  focus: FocusRequest | null
  onMoved: (center: LatLng, zoom: number) => void
}) {
  const map = useMap()
  const lastFit = useRef(-1)
  const lastFocus = useRef(-1)

  useEffect(() => {
    if (!fit || fit.token === lastFit.current || fit.points.length === 0) return
    lastFit.current = fit.token

    const bounds = L.latLngBounds(fit.points.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: MAX_AUTO_FIT_ZOOM, animate: true })
  }, [map, fit])

  useEffect(() => {
    if (!focus || focus.token === lastFocus.current) return
    lastFocus.current = focus.token
    map.setView([focus.lat, focus.lng], Math.max(map.getZoom(), 15), { animate: true })
  }, [map, focus])

  useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      onMoved({ lat: c.lat, lng: c.lng }, map.getZoom())
    },
  })

  return null
}

/** One need chip. Shows how many places it would return. */
function NeedChip({
  needKey, count, active, onClick, t,
}: {
  needKey: NeedKey
  count: number
  active: boolean
  onClick: () => void
  t: (key: string) => string
}) {
  const { labelKey, icon } = NEED_DEFS[needKey]
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
        'border transition-colors whitespace-nowrap',
        active
          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400',
      )}
    >
      <span className="text-base leading-none" aria-hidden>{icon}</span>
      {t(labelKey)}
      <span className={active ? 'text-white/70' : 'text-gray-400'}>{count}</span>
    </button>
  )
}

export default function MapPage() {
  const {
    mapCenter, mapZoom, filters, selectedId, userLocation,
    setSelectedId, setUserLocation, setMapCenter, setMapZoom,
    setFilters, clearFilters, clearRefinements,
  } = useMapStore()
  const toast = useToast()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [locating, setLocating] = useState(false)
  const [fit, setFit] = useState<FitRequest | null>(null)
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [mapExpanded, setMapExpanded] = useState(false)
  const channelRef = useRef<ReturnType<typeof subscribeToBedUpdates> | null>(null)

  // Typing stays responsive: filtering runs against the deferred value.
  const deferredQuery = useDeferredValue(searchQuery)

  // "Open right now" has to keep being true. The clock is re-read every minute
  // so a place that closes at 5 drops out of the results at 5, without the
  // visitor reloading the page.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [])

  // ── Deep links from the marketing category pages ──
  // Filters persist across sessions, so a deep link clears first: the linking
  // page has no way to know what the visitor left set last time.
  useEffect(() => {
    const category = searchParams.get('category')
    const quick = searchParams.get('quickFilter') as QuickFilterKey | null
    const subcategory = searchParams.get('subcategory')
    const populationFocus = searchParams.get('populationFocus')

    if (category) {
      const resolved = CATEGORY_SLUG_MAP[category]
      clearFilters()
      const need = resolved ? needForCategory(resolved) : undefined
      setFilters(need ? { need } : { category: resolved })
      return
    }
    if (quick) {
      clearFilters()
      // Translated at the door rather than stored raw, so a legacy key with no
      // need equivalent (mens_help, womens_help) still narrows the list instead
      // of showing everything under an "active" label.
      setFilters(quickFilterToFilters(quick))
      return
    }
    if (subcategory) {
      clearFilters()
      setFilters({ subcategory: subcategory.split(',') })
      return
    }
    if (populationFocus) {
      const tags = populationFocus.split(',').filter(Boolean)
      clearFilters()
      // Several needs *are* a population tag (Students, Veterans, Families…).
      // When the link names exactly one of them, set the need chip instead of
      // the refinement: same predicate, but the visitor can see what is active
      // and switch away from it.
      const need = needForPopulationFocus(tags)
      setFilters(need ? { need } : { populationFocus: tags })
      return
    }
    if (searchParams.get('hasShowers') === 'true') {
      // /showers is deliberately narrower than /hygiene (see lib/categories.ts):
      // it promises somewhere to actually shower. The hygiene need alone would
      // also match restroom- and laundry-only listings, so the showers
      // refinement is kept — it shows as a removable chip, so the narrowing is
      // visible rather than hidden.
      clearFilters()
      setFilters({ need: 'hygiene', hasShowers: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data ──
  // One fetch of the public set; every facet is applied in the browser, so no
  // filter or pan costs a round trip.
  const { data: allResources = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['map-resources'],
    queryFn: fetchMapResources,
    staleTime: 5 * 60 * 1000,
  })

  // Distance origin. Panning shouldn't re-sort the list on every frame, so the
  // map centre is only adopted once the map has been still for a moment.
  const [stableCenter, setStableCenter] = useState(mapCenter)
  useEffect(() => {
    const t = setTimeout(() => setStableCenter(mapCenter), 400)
    return () => clearTimeout(t)
  }, [mapCenter.lat, mapCenter.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const origin = userLocation ?? stableCenter

  const ranked = useMemo(
    () => filterResources(allResources, filters, deferredQuery, origin, now),
    [allResources, filters, deferredQuery, origin, now],
  )
  const counts = useMemo(
    () => computeFacetCounts(allResources, filters, deferredQuery, origin, now),
    [allResources, filters, deferredQuery, origin, now],
  )

  // "Open right now" excludes listings that publish no hours at all, so the
  // map has to say how many were set aside rather than dropping them silently.
  const hiddenForUnknownHours = useMemo(() => {
    if (!filters.openNow) return 0
    return filterResources(
      allResources, { ...filters, openNow: undefined }, deferredQuery, origin, now,
    ).filter((r) => !hasKnownHours(r.resource)).length
  }, [allResources, filters, deferredQuery, origin, now])

  const openNowCount = counts.toggles.openNow ?? 0
  const showOpenNowPill =
    !!filters.openNow || isUsefulOption(openNowCount, counts.base.toggles.openNow ?? 0)

  const selected = ranked.find((r) => r.resource.id === selectedId)
  const activeRefinements = countActiveRefinements(filters)
  const refinementLabels = activeFilterLabels(filters, t).slice(filters.need ? 1 : 0)

  // ── Fit the map to what the list is showing ──
  // Re-fits when the *set* changes (a need chip, a search), not when the user
  // pans — otherwise the map would keep yanking itself back.
  const fitSignature = filterSignature(filters, deferredQuery)
  const fitToken = useRef(0)
  useEffect(() => {
    if (!ranked.length) return
    fitToken.current += 1
    setFit({
      token: fitToken.current,
      points: ranked
        .filter((r) => r.resource.lat != null && r.resource.lng != null)
        .map((r) => ({ lat: r.resource.lat!, lng: r.resource.lng! })),
    })
    // Only the signature drives a re-fit; `ranked` is read for its current value.
  }, [fitSignature, allResources.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime bed counts ──
  const resourceIdKey = ranked.map((r) => r.resource.id).join(',')
  useEffect(() => {
    if (!resourceIdKey) return
    channelRef.current?.unsubscribe()
    channelRef.current = subscribeToBedUpdates(resourceIdKey.split(','), () => { refetch() })
    return () => { channelRef.current?.unsubscribe() }
  }, [resourceIdKey, refetch])

  // ── Actions ──
  const selectResource = useCallback((id: string, lat: number | null, lng: number | null) => {
    setSelectedId(id)
    if (lat != null && lng != null) {
      setFocus({ lat, lng, token: Date.now() })
    }
  }, [setSelectedId])

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t('map.toast.locationUnavailableTitle'), t('map.toast.locationNoSupport'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setStableCenter(loc)
        setFocus({ ...loc, token: Date.now() })
        setLocating(false)
      },
      () => {
        toast.error(t('map.toast.locationUnavailableTitle'), t('map.toast.locationDenied'))
        setLocating(false)
      },
      { timeout: 10_000 },
    )
  }, [setUserLocation, toast, t])

  const pickNeed = useCallback((key: NeedKey) => {
    setSelectedId(null)
    setFilters(
      filters.need === key
        ? { need: undefined, category: undefined, quickFilter: undefined }
        : { need: key, category: undefined, quickFilter: undefined },
    )
  }, [filters.need, setFilters, setSelectedId])

  const resetAll = useCallback(() => {
    clearFilters()
    setSearchQuery('')
    setSelectedId(null)
  }, [clearFilters, setSelectedId])

  const points = ranked
    .filter((r) => r.resource.lat != null && r.resource.lng != null)
    .map((r) => ({ lat: r.resource.lat!, lng: r.resource.lng! }))

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-100">

      {/* ── Search + controls ── */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 px-3 pt-2.5">
            <Link
              to="/"
              className="hidden sm:flex w-8 h-8 rounded-lg bg-primary-600 items-center justify-center
                         text-white text-[11px] font-black shrink-0"
              aria-label={t('map.homeAria')}
            >
              SR
            </Link>

            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="search"
                inputMode="search"
                placeholder={t('map.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 min-w-0"
                aria-label={t('map.searchAria')}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600" aria-label={t('map.clearSearch')}>
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(true)}
              className={clsx(
                'btn-icon relative shrink-0 bg-gray-100 hover:bg-gray-200',
                activeRefinements > 0 && 'ring-2 ring-primary-600',
              )}
              aria-label={t('map.openFilters')}
            >
              <SlidersHorizontal size={18} className={activeRefinements > 0 ? 'text-primary-600' : 'text-gray-600'} />
              {activeRefinements > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-bold
                                 rounded-full w-4 h-4 flex items-center justify-center">
                  {activeRefinements}
                </span>
              )}
            </button>

            <button
              onClick={locateUser}
              disabled={locating}
              className={clsx('btn-icon shrink-0 bg-gray-100 hover:bg-gray-200', locating && 'opacity-60')}
              aria-label={t('map.findLocation')}
            >
              <LocateFixed size={18} className={clsx(locating ? 'text-primary-600 animate-pulse' : 'text-gray-600')} />
            </button>

            <LangToggle className="shrink-0" />
          </div>

          {/* Need chips — one flat list, one active at a time, each with a count.
              "Open now" leads the row but is a modifier, not a need, so it is
              styled apart and separated by a rule. */}
          <div className="flex gap-2 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {showOpenNowPill && (
              <>
                <button
                  onClick={() => setFilters({ openNow: filters.openNow ? undefined : true })}
                  aria-pressed={!!filters.openNow}
                  className={clsx(
                    'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                    'border transition-colors whitespace-nowrap',
                    filters.openNow
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-emerald-700 border-emerald-300 hover:border-emerald-500',
                  )}
                >
                  <Clock size={14} />
                  {t('map.openNow')}
                  <span className={filters.openNow ? 'text-white/70' : 'text-emerald-500'}>
                    {openNowCount}
                  </span>
                </button>
                <div className="shrink-0 w-px bg-gray-200 my-1.5" aria-hidden />
              </>
            )}
            {NEED_ORDER.filter((key) => (counts.needs[key] ?? 0) > 0 || filters.need === key).map((key) => (
              <NeedChip
                key={key}
                needKey={key}
                count={counts.needs[key] ?? 0}
                active={filters.need === key}
                onClick={() => pickNeed(key)}
                t={t}
              />
            ))}
          </div>

          {/* Applied refinements, each removable */}
          {refinementLabels.length > 0 && (
            <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {refinementLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => setFilters(clearedFilter(filters, label, t))}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary-50
                             text-primary-700 text-xs font-medium px-2.5 py-1 hover:bg-primary-100"
                >
                  {label}
                  <X size={12} />
                </button>
              ))}
              <button
                onClick={clearRefinements}
                className="shrink-0 text-xs text-gray-500 px-2 py-1 hover:text-gray-700"
              >
                {t('map.clear')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 max-w-3xl mx-auto w-full">

        {/* Map card */}
        <div
          className={clsx(
            'relative shrink-0 rounded-2xl overflow-hidden shadow-card bg-white transition-[height] duration-300',
            mapExpanded ? 'h-[60%]' : 'h-[38%] md:h-[45%]',
          )}
        >
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
            className="w-full h-full z-[10]"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController
              fit={fit}
              focus={focus}
              onMoved={(center, zoom) => { setMapCenter(center); setMapZoom(zoom) }}
            />
            {ranked.map(({ resource }) => (
              <ResourceMarker
                key={resource.id}
                resource={resource}
                isSelected={resource.id === selectedId}
                onClick={() => selectResource(resource.id, resource.lat, resource.lng)}
              />
            ))}
          </MapContainer>

          {/* Re-fit / expand controls */}
          <div className="absolute top-2 right-2 z-[20] flex flex-col gap-1.5">
            <button
              onClick={() => setMapExpanded((v) => !v)}
              className="w-8 h-8 rounded-lg bg-white shadow-md flex items-center justify-center
                         text-gray-600 hover:text-gray-900"
              aria-label={mapExpanded ? t('map.shrinkMap') : t('map.expandMap')}
            >
              <Maximize2 size={15} />
            </button>
            {points.length > 0 && (
              <button
                onClick={() => { fitToken.current += 1; setFit({ token: fitToken.current, points }) }}
                className="w-8 h-8 rounded-lg bg-white shadow-md flex items-center justify-center
                           text-gray-600 hover:text-gray-900"
                aria-label={t('map.fitResults')}
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>

          {ranked.length === 0 && !isLoading && (
            <div className="absolute inset-0 z-[20] bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <p className="text-sm text-gray-500">{t('map.noMatch')}</p>
            </div>
          )}
        </div>

        {/* List card */}
        <div className="flex-1 min-h-0 rounded-2xl bg-white shadow-card flex flex-col overflow-hidden">
          <div className="shrink-0 flex items-baseline justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">
              {isLoading
                ? t('map.loading')
                : `${ranked.length} ${ranked.length === 1 ? t('filterDrawer.place') : t('filterDrawer.places')}`}
              {filters.need && (
                <span className="text-gray-400 font-normal"> · {t(NEED_DEFS[filters.need].labelKey)}</span>
              )}
            </h2>
            <span className="text-xs text-gray-400">
              {userLocation ? t('map.nearestFirst') : t('map.nearestToCenter')}
            </span>
          </div>

          {filters.openNow && hiddenForUnknownHours > 0 && (
            <p className="shrink-0 px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
              {(hiddenForUnknownHours === 1 ? t('map.hiddenHoursOneBefore') : t('map.hiddenHoursOtherBefore'))
                .replace('{count}', String(hiddenForUnknownHours))}
              <span className="font-medium">{t('toggle.openNow.label')}</span>
              {hiddenForUnknownHours === 1 ? t('map.hiddenHoursOneAfter') : t('map.hiddenHoursOtherAfter')}
            </p>
          )}

          <div className="flex-1 overflow-y-auto px-1 py-1 pb-16 md:pb-2">
            {isLoading && (
              <div className="p-3 space-y-2">
                {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
              </div>
            )}

            {isError && (
              <div className="text-center py-10 px-4">
                <AlertCircle size={28} className="text-danger-500 mx-auto mb-3" />
                <p className="text-sm text-gray-700 mb-1">{t('map.loadError')}</p>
                <p className="text-xs text-gray-400 mb-4">{t('map.loadErrorHint')}</p>
                <button onClick={() => refetch()} className="btn-secondary btn-sm">{t('map.retry')}</button>
              </div>
            )}

            {!isLoading && !isError && ranked.map(({ resource, distanceKm }) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                distanceKm={distanceKm}
                isSelected={resource.id === selectedId}
                onClick={() => selectResource(resource.id, resource.lat, resource.lng)}
              />
            ))}

            {!isLoading && !isError && ranked.length === 0 && (
              <div className="text-center py-10 px-6">
                <p className="text-sm text-gray-700 mb-1">
                  {filters.openNow ? t('map.emptyOpenNow') : t('map.emptyNoMatch')}
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  {filters.openNow
                    ? t('map.emptyOpenNowHint')
                    : activeRefinements > 0
                    ? t('map.emptyRefinementsHint')
                    : t('map.emptyDefaultHint')}
                </p>
                <div className="flex flex-col gap-2 items-center">
                  {filters.openNow && (
                    <button
                      onClick={() => setFilters({ openNow: undefined })}
                      className="btn-secondary btn-sm"
                    >
                      {t('map.showAnytime')}
                    </button>
                  )}
                  {activeRefinements > 0 && (
                    <button onClick={clearRefinements} className="btn-secondary btn-sm">
                      {t('map.removeFiltersKeep')} {filters.need ? t(NEED_DEFS[filters.need].labelKey).toLowerCase() : t('map.searchFallback')}
                    </button>
                  )}
                  <button onClick={resetAll} className="text-sm text-primary-600 font-medium">
                    {t('map.startOver')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Overlays ── */}
      {selected && (
        <ResourceSheet
          resource={selected.resource}
          distanceKm={selected.distanceKm}
          onClose={() => setSelectedId(null)}
        />
      )}

      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        counts={counts}
        hasOrigin
      />
    </div>
  )
}
