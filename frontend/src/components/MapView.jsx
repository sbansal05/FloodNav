import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { lineStyle } from '../lib/roadStyle.js'

// One shared canvas renderer: thousands of SVG roads would be far too slow.
const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 8 })

// divIcons avoid Leaflet's default marker image paths, which break under bundlers.
const campIcon = (label, active) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin camp ${active ? 'active' : ''}">${label}</div>`,
    iconSize: [64, 26],
    iconAnchor: [32, 13],
  })
const startIcon = L.divIcon({
  className: '',
  html: '<div class="map-pin start">You</div>',
  iconSize: [38, 24],
  iconAnchor: [19, 12],
})

/** All roads, created once and restyled when the scenario or selection changes. */
function RoadsLayer({ edges, nodeById, statuses, selectedRoadId, mode, onSelectRoad }) {
  const map = useMap()
  const layersRef = useRef(new Map())
  const appliedRef = useRef(new Map())
  const live = useRef({ mode, onSelectRoad })

  useEffect(() => {
    live.current = { mode, onSelectRoad }
  })

  useEffect(() => {
    const group = L.featureGroup()
    const layers = new Map()
    for (const e of edges) {
      const a = nodeById.get(e.from)
      const b = nodeById.get(e.to)
      const line = L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        { renderer: canvasRenderer, ...lineStyle('open', false) },
      )
      line.on('click', () => {
        if (live.current.mode === 'road') live.current.onSelectRoad(e.id)
      })
      line.addTo(group)
      layers.set(e.id, line)
    }
    group.addTo(map)
    layersRef.current = layers
    appliedRef.current = new Map()
    return () => {
      group.remove()
      layersRef.current = new Map()
    }
  }, [map, edges, nodeById])

  useEffect(() => {
    const layers = layersRef.current
    const applied = appliedRef.current
    for (const e of edges) {
      const line = layers.get(e.id)
      if (!line) continue
      const status = statuses.get(e.id) ?? 'open'
      const selected = e.id === selectedRoadId
      const key = status + (selected ? '*' : '')
      if (applied.get(e.id) === key) continue
      line.setStyle(lineStyle(status, selected))
      applied.set(e.id, key)
      if (selected) line.bringToFront()
    }
  }, [edges, statuses, selectedRoadId])

  return null
}

/** Recommended route: white casing + blue line on top of the roads. */
function RouteLayer({ route, nodeById }) {
  const map = useMap()
  useEffect(() => {
    if (!route.reachable || route.path.length < 2) return
    const pts = route.path.map((id) => {
      const n = nodeById.get(id)
      return [n.lat, n.lng]
    })
    const casing = L.polyline(pts, { renderer: canvasRenderer, color: '#fff', weight: 11, opacity: 0.9, interactive: false }).addTo(map)
    const line = L.polyline(pts, { renderer: canvasRenderer, color: '#1f6feb', weight: 6, interactive: false }).addTo(map)
    casing.bringToFront()
    line.bringToFront()
    return () => {
      casing.remove()
      line.remove()
    }
  }, [map, route, nodeById])
  return null
}

/** Purple glow under roads the user has reported. */
function ReportedLayer({ reportedRoadIds, edgeById, nodeById }) {
  const map = useMap()
  useEffect(() => {
    const lines = []
    for (const id of reportedRoadIds) {
      const e = edgeById.get(id)
      if (!e) continue
      const a = nodeById.get(e.from)
      const b = nodeById.get(e.to)
      const line = L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        { renderer: canvasRenderer, color: '#7b4bd6', weight: 14, opacity: 0.4, interactive: false },
      ).addTo(map)
      line.bringToBack()
      lines.push(line)
    }
    return () => lines.forEach((l) => l.remove())
  }, [map, reportedRoadIds, edgeById, nodeById])
  return null
}

function MapClick({ mode, onPick }) {
  useMapEvents({
    click(e) {
      if (mode === 'start') onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FitController({ fit }) {
  const map = useMap()
  useEffect(() => {
    if (!fit?.points?.length) return
    // Wait one frame so the map knows its real size before zooming to the route.
    const id = requestAnimationFrame(() => {
      map.invalidateSize()
      map.fitBounds(fit.points, { padding: [48, 48], maxZoom: 17 })
    })
    return () => cancelAnimationFrame(id)
  }, [map, fit])
  return null
}

export default function MapView({
  nodeById,
  edgeById,
  drawEdges,
  camps,
  statuses,
  route,
  startId,
  mode,
  onPickStart,
  selectedRoadId,
  onSelectRoad,
  reportedRoadIds,
  fit,
}) {
  const start = nodeById.get(startId)
  const center = camps[0] ? [camps[0].lat, camps[0].lng] : [start.lat, start.lng]

  return (
    <MapContainer
      center={center}
      zoom={14}
      className={`map mode-${mode}`}
      renderer={canvasRenderer}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitController fit={fit} />
      <MapClick mode={mode} onPick={onPickStart} />

      <ReportedLayer reportedRoadIds={reportedRoadIds} edgeById={edgeById} nodeById={nodeById} />
      <RoadsLayer
        edges={drawEdges}
        nodeById={nodeById}
        statuses={statuses}
        selectedRoadId={selectedRoadId}
        mode={mode}
        onSelectRoad={onSelectRoad}
      />
      <RouteLayer route={route} nodeById={nodeById} />

      {camps.map((c, i) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={campIcon(`Camp ${i + 1}`, route.camp?.id === c.id)}
          zIndexOffset={route.camp?.id === c.id ? 900 : 500}        >
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