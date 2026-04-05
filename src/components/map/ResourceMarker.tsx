import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Resource } from '@/types'

function MarkerIcon({ status, category }: { status: string; category: string }) {
  const colors: Record<string, string> = {
    available: '#22c55e',
    limited:   '#f59e0b',
    full:      '#ef4444',
    unknown:   '#94a3b8',
    closed:    '#6b7280',
  }

  const emojis: Record<string, string> = {
    shelter:       '🏠',
    food:          '🍽',
    work_exchange: '🤝',
    mental_health: '💙',
    medical:       '⚕',
    legal:         '⚖',
    hygiene:       '🚿',
    clothing:      '👕',
    childcare:     '👶',
    transportation:'🚌',
    other:         '📍',
  }

  const color  = colors[status]  ?? colors.unknown
  const emoji  = emojis[category] ?? emojis.other

  return (
    <div style={{
      width: 36, height: 36,
      borderRadius: '50% 50% 50% 0',
      transform: 'rotate(-45deg)',
      backgroundColor: color,
      border: '2px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ transform: 'rotate(45deg)', fontSize: 14 }}>{emoji}</span>
    </div>
  )
}

function makeIcon(resource: Resource, selected: boolean) {
  const html = renderToStaticMarkup(
    <MarkerIcon status={resource.availability_status} category={resource.category} />
  )
  const size = selected ? 44 : 36
  return L.divIcon({
    html,
    className: '',
    iconSize:     [size, size],
    iconAnchor:   [size / 2, size],
    popupAnchor:  [0, -size],
  })
}

interface Props {
  resource:   Resource
  isSelected: boolean
  onClick:    () => void
}

export default function ResourceMarker({ resource, isSelected, onClick }: Props) {
  // Only render a marker if we have real coordinates (is_map_ready guard)
  if (resource.lat == null || resource.lng == null) return null

  return (
    <Marker
      position={[resource.lat, resource.lng]}
      icon={makeIcon(resource, isSelected)}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      {/* Minimal popup tooltip on hover only */}
      <Popup>
        <div className="p-2 text-xs font-medium text-gray-900 min-w-[120px]">
          {resource.name}
        </div>
      </Popup>
    </Marker>
  )
}
