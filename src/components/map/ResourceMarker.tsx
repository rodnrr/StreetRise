import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { CATEGORY_EMOJI } from '@/lib/mapFilters'
import type { Resource } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  available: '#22c55e',
  limited:   '#f59e0b',
  full:      '#ef4444',
  unknown:   '#94a3b8',
  closed:    '#6b7280',
}

function CircleIcon({
  status,
  category,
  selected,
}: {
  status: string
  category: string
  selected: boolean
}) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.unknown
  const emoji = CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.other
  const size  = selected ? 42 : 32
  const fontSize = selected ? 16 : 13

  return (
    <div
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        backgroundColor: color,
        border:       selected ? '3px solid white' : '2px solid white',
        boxShadow:    selected
          ? '0 0 0 2px ' + color + ', 0 4px 12px rgba(0,0,0,0.35)'
          : '0 2px 6px rgba(0,0,0,0.28)',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        fontSize,
        lineHeight:  1,
        userSelect:  'none',
        transition:  'all 0.15s ease',
      }}
    >
      {emoji}
    </div>
  )
}

function makeIcon(resource: Resource, selected: boolean) {
  const html = renderToStaticMarkup(
    <CircleIcon
      status={resource.availability_status}
      category={resource.category}
      selected={selected}
    />,
  )
  const size = selected ? 42 : 32
  return L.divIcon({
    html,
    className:   '',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  })
}

interface Props {
  resource:   Resource
  isSelected: boolean
  onClick:    () => void
}

export default function ResourceMarker({ resource, isSelected, onClick }: Props) {
  if (resource.lat == null || resource.lng == null) return null

  return (
    <Marker
      position={[resource.lat, resource.lng]}
      icon={makeIcon(resource, isSelected)}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
    />
  )
}
