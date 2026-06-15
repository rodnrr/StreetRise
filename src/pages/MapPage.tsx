import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, LocateFixed, List, Map } from 'lucide-react'
import clsx from 'clsx'
import { useMapStore, useToast } from '@/lib/store'
import { subscribeToBedUpdates } from '@/lib/supabase'
import {
  fetchMapResources,
  countActiveFilters,
  activeFilterSummary,
  QUICK_FILTER_DEFS,
  QUICK_FILTER_ORDER,
  CATEGORY_SLUG_MAP,
} from '@/lib/mapFilters'
import type { QuickFilterKey } from '@/types'

import ResourceMarker from '@/components/map/ResourceMarker'
import ResourceCard from '@/components/map/ResourceCard'
import FilterDrawer from '@/components/map/FilterDrawer'
import 'leaflet/dist/leaflet.css'

// ── Map sync — keeps the Leaflet instance in step with the Zustand store ──
function MapSync() {
  const { mapCenter, mapZoom, setMapCenter, setMapZoom } = useMapStore()
  const map = useMap()
  const isProgrammatic = useRef(false)

  useEffect(() => {
    isProgrammatic.current = true
    map.setView([mapCenter.lat, mapCenter.lng], mapZoom, { animate: true })
    const timer = setTimeout(() => { isProgrammatic.current = false }, 600)
    return () => clearTimeout(timer)
  }, [map, mapCenter.lat, mapCenter.lng, mapZoom])

  useMapEvents({
    moveend: () => {
      if (isProgrammatic.current) return
      const c = map.getCenter()
      setMapCenter({ lat: c.lat, lng: c.lng })
    },
    zoomend: () => {
      if (isProgrammatic.current) return
      setMapZoom(map.getZoom())
    },
  })
  return null
}

// ── Quick filter chip ──
function QuickChip({
  filterKey,
  active,
  onClick,
}: {
  filterKey: QuickFilterKey
  active: boolean
  onClick: () => void
}) {
  const { label, icon } = QUICK_FILTER_DEFS[filterKey]
  return (
    <button
      onClick={onClick}
      className={clsx(
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
        'border transition-colors shadow-sm whitespace-nowrap',
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400',
      )}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </button>
  )
}

// ── Main MapPage ──
export default function MapPage() {
  const { mapCenter, mapZoom, filters, selectedId, setSelectedId, setUserLocation, setMapZoom, setFilters } =
    useMapStore()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery]   = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [showList,    setShowList]      = useState(false)
  const [locating,    setLocating]      = useState(false)
  const channelRef = useRef<ReturnType<typeof subscribeToBedUpdates> | null>(null)

  // Sync ?category= query param into the store filter on mount
  useEffect(() => {
    if (!searchParams.has('category')) return
    const resolved = CATEGORY_SLUG_MAP[searchParams.get('category') ?? '']
    setFilters({ category: resolved, quickFilter: undefined })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced map center — only re-query after 400ms of stillness
  const [stableCenter, setStableCenter] = useState(mapCenter)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setStableCenter(mapCenter), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [mapCenter.lat, mapCenter.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch resources
  const { data: resources = [], refetch } = useQuery({
    queryKey: ['resources', stableCenter, filters],
    queryFn:  () => fetchMapResources(stableCenter.lat, stableCenter.lng, filters, searchQuery),
    staleTime: 1000 * 60,
  })

  // Re-run when search query changes (client-side filter, but refetch keeps it fresh)
  const { data: filtered = resources } = useQuery({
    queryKey: ['resources-filtered', resources, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return resources
      const q = searchQuery.toLowerCase().trim()
      return resources.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.resource_type?.toLowerCase() ?? '').includes(q) ||
          (r.address.city?.toLowerCase() ?? '').includes(q),
      )
    },
    staleTime: 0,
  })

  // Subscribe to realtime bed updates
  useEffect(() => {
    if (!resources.length) return
    channelRef.current?.unsubscribe()
    channelRef.current = subscribeToBedUpdates(
      resources.map((r) => r.id),
      () => { refetch() },
    )
    return () => { channelRef.current?.unsubscribe() }
  }, [resources.map((r) => r.id).join(','), refetch]) // eslint-disable-line

  // Geolocation
  const locateUser = useCallback(() => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setMapZoom(15)
        setLocating(false)
      },
      () => {
        toast.error('Location unavailable', 'Enable location access and try again.')
        setLocating(false)
      },
      { timeout: 10_000 },
    )
  }, [setUserLocation, setMapZoom, toast])

  const toggleQuickFilter = useCallback(
    (key: QuickFilterKey) => {
      if (filters.quickFilter === key) {
        setFilters({ quickFilter: undefined })
      } else {
        // Clear category/resourceType when activating a quick filter
        setFilters({ quickFilter: key, category: undefined, resourceType: undefined })
      }
    },
    [filters.quickFilter, setFilters],
  )

  const selectedResource = filtered.find((r) => r.id === selectedId)
  const activeFilterCount = countActiveFilters(filters)
  const filterSummary     = activeFilterSummary(filters)

  return (
    <div className="relative h-[100dvh] flex flex-col overflow-hidden">

      {/* ── Top controls overlay ── */}
      <div className="absolute top-0 inset-x-0 z-[30] pointer-events-none">
        {/* Search row */}
        <div className="flex gap-2 px-3 pt-3 pb-1.5 pointer-events-auto">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl shadow-map px-3 py-2.5">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search shelters, food, services…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(true)}
            className={clsx(
              'btn-icon bg-white shadow-map relative',
              activeFilterCount > 0 && 'ring-2 ring-primary-600',
            )}
            aria-label="Open filters"
          >
            <SlidersHorizontal
              size={18}
              className={activeFilterCount > 0 ? 'text-primary-600' : 'text-gray-600'}
            />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={locateUser}
            disabled={locating}
            className={clsx('btn-icon bg-white shadow-map', locating && 'opacity-60')}
            aria-label="Find my location"
          >
            <LocateFixed
              size={18}
              className={clsx('transition-colors', locating ? 'text-primary-600 animate-pulse' : 'text-gray-600')}
            />
          </button>
        </div>

        {/* Quick filter chips — horizontal scroll */}
        <div
          className="flex gap-2 px-3 pb-2 overflow-x-auto pointer-events-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {QUICK_FILTER_ORDER.map((key) => (
            <QuickChip
              key={key}
              filterKey={key}
              active={filters.quickFilter === key}
              onClick={() => toggleQuickFilter(key)}
            />
          ))}
        </div>

        {/* Active filter summary pill */}
        {filterSummary && (
          <div className="flex justify-center pb-1 pointer-events-none">
            <span className="bg-primary-600/90 text-white text-xs font-medium rounded-full px-3 py-1 shadow-sm backdrop-blur-sm">
              {filterSummary}
            </span>
          </div>
        )}
      </div>

      {/* ── Leaflet map ── */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapZoom}
        className="flex-1 z-[10]"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSync />
        {filtered.map((resource) => (
          <ResourceMarker
            key={resource.id}
            resource={resource}
            isSelected={resource.id === selectedId}
            onClick={() => {
              if (resource.id === selectedId) {
                setSelectedId(null)
              } else {
                setSelectedId(resource.id)
                setShowList(false)
              }
            }}
          />
        ))}
      </MapContainer>

      {/* ── Selected resource card ── */}
      {selectedResource && (
        <div className="absolute bottom-20 inset-x-4 z-[30] animate-slide-up">
          <ResourceCard
            resource={selectedResource}
            onClose={() => {
              setSelectedId(null)
              setShowList(true)
            }}
          />
        </div>
      )}

      {/* ── List view bottom sheet ── */}
      {showList && !selectedResource && (
        <div className="bottom-sheet h-[60vh] overflow-y-auto z-[25]">
          <div className="bottom-sheet-handle" />
          <div className="p-4 space-y-3 pb-20">
            <h2 className="font-semibold text-gray-900 text-sm">
              {filtered.length} resource{filtered.length !== 1 ? 's' : ''} nearby
              {filterSummary && <span className="text-gray-400 font-normal"> · {filterSummary}</span>}
            </h2>
            {filtered.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                compact
                onClick={() => {
                  setSelectedId(r.id)
                  setShowList(false)
                }}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500 text-sm mb-3">No resources found.</p>
                <p className="text-gray-400 text-xs">Try adjusting your filters, zooming out, or searching a different area.</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { useMapStore.getState().clearFilters(); setSearchQuery('') }}
                    className="mt-4 text-sm text-primary-600 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── List / Map toggle button ── */}
      {!selectedResource && (
        <button
          onClick={() => setShowList(!showList)}
          className={clsx(
            'absolute bottom-4 left-1/2 -translate-x-1/2 z-[30]',
            'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-lg',
            'transition-colors',
            showList
              ? 'bg-gray-900 text-white'
              : 'bg-gray-900 text-white',
          )}
        >
          {showList ? (
            <>
              <Map size={15} />
              Map
            </>
          ) : (
            <>
              <List size={15} />
              List{filtered.length > 0 && ` (${filtered.length})`}
            </>
          )}
        </button>
      )}

      {/* ── Filter drawer ── */}
      <FilterDrawer open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
