import { memo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { CATEGORY_EMOJI } from '@/lib/mapFilters'
import type { Resource } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  available: '#22c55e',
  limited:   '#f59e0b',
  full:      '#ef4444',
  unknown:   '#94a3b8',
  closed:    '#6b7280',
}

// Icons are pure functions of (category, status, selected) and the map renders
// every visible resource at once, so they are built once and reused. The
// previous version ran renderToStaticMarkup for every marker on every render,
// which is what made panning feel heavy with a few hundred pins.
const iconCache = new Map<string, L.DivIcon>()

function getIcon(category: string, status: string, selected: boolean): L.DivIcon {
  const key = `${category}|${status}|${selected}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const color = STATUS_COLOR[status] ?? STATUS_COLOR.unknown
  const emoji = CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.other
  const size = selected ? 44 : 32
  const fontSize = selected ? 17 : 13
  const ring = selected
    ? `box-shadow:0 0 0 3px ${color}55,0 4px 12px rgba(0,0,0,.35);`
    : 'box-shadow:0 2px 6px rgba(0,0,0,.28);'

  const html =
    `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
    `background:${color};border:${selected ? 3 : 2}px solid #fff;${ring}` +
    `display:flex;align-items:center;justify-content:center;` +
    `font-size:${fontSize}px;line-height:1;user-select:none;">${emoji}</div>`

  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
  iconCache.set(key, icon)
  return icon
}

interface Props {
  resource: Resource
  isSelected: boolean
  onClick: () => void
}

function ResourceMarker({ resource, isSelected, onClick }: Props) {
  if (resource.lat == null || resource.lng == null) return null

  return (
    <Marker
      position={[resource.lat, resource.lng]}
      icon={getIcon(resource.category, resource.availability_status, isSelected)}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
      title={resource.name}
    />
  )
}

export default memo(ResourceMarker)
