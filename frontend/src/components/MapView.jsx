import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDistance } from '../lib/routing.js'
import { STATUS_STYLE } from '../lib/roadStyle.js'

// divIcons avoid Leaflet's default marker image paths, which break under bundlers.
const campIcon = (active) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin camp ${active ? 'active' : ''}">+</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
const startIcon = L.divIcon({
  className: '',
  html: '<div class="map-pin start">You</div>',
  iconSize: [38, 24],
  iconAnchor: [19, 12],
})

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [32, 32] })
  }, [map, points])
  return null
}

export default function MapView({
  nodes,
  edges,
  camps,
  statuses,
  route,
  startId,
  onSetStart,
  selectedRoadId,
  onSelectRoad,
  reportedRoadIds,
}) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const bounds = useMemo(() => nodes.map((n) => [n.lat, n.lng]), [nodes])
  const pos = (id) => {
    const n = nodeById.get(id)
    return [n.lat, n.lng]
  }
  const routePositions = route.reachable ? route.path.map(pos) : []
  const start = nodeById.get(startId)

  return (
    <MapContainer center={bounds[0]} zoom={16} className="map" scrollWheelZoom>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={bounds} />

      {edges.map((e) => {
        const positions = [pos(e.from), pos(e.to)]
        const status = statuses.get(e.id) ?? 'open'
        const style = STATUS_STYLE[status]
        const selected = e.id === selectedRoadId
        return (
          <div key={e.id}>
            {reportedRoadIds.has(e.id) && (
              <Polyline
                positions={positions}
                pathOptions={{ color: '#7b4bd6', weight: 14, opacity: 0.35 }}
                interactive={false}
              />
            )}
            <Polyline
              positions={positions}
              pathOptions={{
                color: style.color,
                weight: selected ? 8 : 5,
                dashArray: style.dashArray,
                opacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelectRoad(e.id) }}
            >
              <Tooltip sticky>
                Road {e.id} · {formatDistance(e.distance)} · {style.label}
                {reportedRoadIds.has(e.id) ? ' · reported' : ''}
              </Tooltip>
            </Polyline>
          </div>
        )
      })}

      {routePositions.length > 1 && (
        <>
          <Polyline positions={routePositions} pathOptions={{ color: '#fff', weight: 11, opacity: 0.9 }} interactive={false} />
          <Polyline positions={routePositions} pathOptions={{ color: '#1f6feb', weight: 6 }} interactive={false} />
        </>
      )}

      {nodes.map((n) => (
        <CircleMarker
          key={n.id}
          center={[n.lat, n.lng]}
          radius={n.id === startId ? 0 : 6}
          pathOptions={{ color: '#334', weight: 2, fillColor: '#fff', fillOpacity: 1 }}
          eventHandlers={{ click: () => onSetStart(n.id) }}
        >
          <Tooltip direction="top">Junction {n.id}: click to start here</Tooltip>
        </CircleMarker>
      ))}

      {camps.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={campIcon(route.camp?.id === c.id)}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {c.name}
            {c.capacity ? ` · capacity ${c.capacity}` : ''}
          </Tooltip>
        </Marker>
      ))}

      {start && <Marker position={[start.lat, start.lng]} icon={startIcon} zIndexOffset={1000} />}
    </MapContainer>
  )
}
