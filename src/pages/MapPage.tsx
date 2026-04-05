import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, LocateFixed, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { useMapStore } from '@/lib/store'
import { db, subscribeToBedUpdates } from '@/lib/supabase'
import type { Resource, ResourceCategory } from '@/types'
import ResourceMarker from '@/components/map/ResourceMarker'
import ResourceCard from '@/components/map/ResourceCard'
import FilterDrawer from '@/components/map/FilterDrawer'
import 'leaflet/dist/leaflet.css'

// ── Map sync component ──
function MapSync() {
  const { mapCenter, mapZoom, setMapCenter, setMapZoom } = useMapStore()
  const map = useMap()
  // Prevent feedback loop: ignore moveend/zoomend triggered by our own setView calls
  const isProgrammatic = useRef(false)

  useEffect(() => {
    isProgrammatic.current = true
    map.setView([mapCenter.lat, mapCenter.lng], mapZoom, { animate: true })
    const timer = setTimeout(() => { isProgrammatic.current = false }, 600)
    return () => clearTimeout(timer)
  }, [mapCenter.lat, mapCenter.lng, mapZoom]) // re-runs on any store-driven center/zoom change

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

// ── Fetch resources near current center (no hard cap) ──
async function fetchResources(lat: number, lng: number, radiusKm = 40, category?: ResourceCategory) {
  let query = db.resources()
    .select('*')
    .eq('is_active', true)
    .eq('verification_status', 'verified')
    // Bounding box filter (approx 1 deg lat ≈ 111 km)
    .gte('lat', lat - radiusKm / 111)
    .lte('lat', lat + radiusKm / 111)
    .gte('lng', lng - radiusKm / 111)
    .lte('lng', lng + radiusKm / 111)
    .order('availability_status', { ascending: true }) // available first

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Resource[]
}

// ── Main MapPage ──
export default function MapPage() {
  const {
    mapCenter, mapZoom, filters, selectedId,
    setSelectedId, setUserLocation, setMapZoom,
  } = useMapStore()

  const [searchQuery, setSearchQuery]   = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [showListView, setShowListView] = useState(false)
  const [locating, setLocating]         = useState(false)
  const channelRef = useRef<ReturnType<typeof subscribeToBedUpdates> | null>(null)

  // Fetch resources
  const { data: resources = [], refetch } = useQuery({
    queryKey: ['resources', mapCenter, filters],
    queryFn: () => fetchResources(mapCenter.lat, mapCenter.lng, filters.radius ?? 40, filters.category),
    staleTime: 1000 * 60, // 1 min
  })

  // Subscribe to realtime bed updates
  useEffect(() => {
    if (!resources.length) return
    channelRef.current?.unsubscribe()
    channelRef.current = subscribeToBedUpdates(
      resources.map((r) => r.id),
      (_id, _beds, _status) => { refetch() }
    )
    return () => { channelRef.current?.unsubscribe() }
  }, [resources.map((r) => r.id).join(',')]) // eslint-disable-line

  // Filter by search query
  const filtered = resources.filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.name.toLowerCase().includes(q) ||
           r.category.toLowerCase().includes(q) ||
           (r.address.city?.toLowerCase() ?? '').includes(q)
  })

  // Geolocation — updates store center+zoom, MapSync picks it up and pans the map
  function locateUser() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setMapZoom(15) // zoom in when located
        setLocating(false)
      },
      () => {
        alert('Unable to get your location. Please enable location access.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  const selectedResource = filtered.find((r) => r.id === selectedId)

  return (
    <div className="relative h-[100dvh] flex flex-col">
      {/* ── Search bar overlay ── */}
      <div className="absolute top-3 inset-x-3 z-[30] flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl shadow-map px-3 py-2.5">
          <Search size={17} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search shelters, food, services…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={clsx(
            'btn-icon bg-white shadow-map',
            Object.keys(filters).length > 0 && 'ring-2 ring-primary-600'
          )}
          aria-label="Filters"
        >
          <SlidersHorizontal size={18} className={Object.keys(filters).length > 0 ? 'text-primary-600' : 'text-gray-600'} />
        </button>
        <button
          onClick={locateUser}
          disabled={locating}
          className={clsx('btn-icon bg-white shadow-map', locating && 'opacity-60')}
          aria-label="Locate me"
        >
          <LocateFixed
            size={18}
            className={clsx('transition-colors', locating ? 'text-primary-600 animate-pulse' : 'text-gray-600')}
          />
        </button>
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
            onClick={() => setSelectedId(resource.id === selectedId ? null : resource.id)}
          />
        ))}
      </MapContainer>

      {/* ── Resource count pill ── */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[30]
                      bg-white/90 backdrop-blur-sm rounded-full px-3 py-1
                      text-xs font-medium text-gray-600 shadow-sm pointer-events-none">
        {filtered.length} resource{filtered.length !== 1 ? 's' : ''} nearby
      </div>

      {/* ── Selected resource card ── */}
      {selectedResource && !showListView && (
        <div className="absolute bottom-4 inset-x-4 z-[30] animate-slide-up">
          <ResourceCard
            resource={selectedResource}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {/* ── List view toggle (mobile) ── */}
      {!selectedResource && (
        <button
          onClick={() => setShowListView(!showListView)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[30]
                     flex items-center gap-1.5 bg-gray-900 text-white
                     rounded-full px-4 py-2 text-sm font-medium shadow-lg"
        >
          <ChevronUp size={16} className={clsx('transition-transform', showListView && 'rotate-180')} />
          {showListView ? 'Map View' : 'List View'}
        </button>
      )}

      {/* ── List view bottom sheet ── */}
      {showListView && (
        <div className="bottom-sheet h-[60vh] overflow-y-auto z-[35]">
          <div className="bottom-sheet-handle" />
          <div className="p-4 space-y-3 pb-8">
            <h2 className="font-semibold text-gray-900">
              {filtered.length} resources nearby
            </h2>
            {filtered.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                compact
                onClick={() => {
                  setSelectedId(r.id)
                  setShowListView(false)
                }}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No resources found. Try adjusting your filters or zooming out.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Filter drawer ── */}
      <FilterDrawer open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
