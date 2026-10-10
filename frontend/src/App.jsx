import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import ReportForm from './components/ReportForm.jsx'
import StatusBar from './components/StatusBar.jsx'
import { classifyRoads, loadData, nearestNode } from './lib/data.js'
import { computeBestRoute, pickDefaultStart } from './lib/routing.js'
import { useReports } from './hooks/useReports.js'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const [startId, setStartId] = useState(null)
  const [mode, setMode] = useState('start') // what a map click does: 'start' | 'road'
  const [selectedRoadId, setSelectedRoadId] = useState('')
  const [fit, setFit] = useState(null)
  const reports = useReports()

  useEffect(() => {
    loadData()
      .then((d) => {
        const start = pickDefaultStart({ nodes: d.nodes, edges: d.edges }, d.camps)
        const startNode = d.nodeById.get(start)
        setData(d)
        setStartId(start)
        setFit({
          points: [[startNode.lat, startNode.lng], ...d.camps.map((c) => [c.lat, c.lng])],
        })
      })
      .catch((e) => setError(e.message))
  }, [])

  const scenario = data?.scenarios[level]

  const statuses = useMemo(
    () => (data ? classifyRoads(data.edges, data.scenarios, level) : new Map()),
    [data, level],
  )

  // Dijkstra runs in the browser, so this works offline.
  const route = useMemo(() => {
    if (!data || !startId) return null
    return computeBestRoute(
      { nodes: data.nodes, edges: data.edges },
      scenario.blocked,
      startId,
      data.camps,
    )
  }, [data, scenario, startId])

  const pickStart = useCallback(
    (lat, lng) => {
      const node = data && nearestNode(data.nodes, lat, lng)
      if (node) setStartId(node.id)
    },
    [data],
  )

  const zoomToRoute = useCallback(() => {
    if (!data || !route) return
    const ids = route.reachable ? route.path : [startId]
    setFit({
      points: ids.map((id) => {
        const n = data.nodeById.get(id)
        return [n.lat, n.lng]
      }),
    })
  }, [data, route, startId])

  const pickRoadOnMap = useCallback(() => {
    setMode('road')
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Flood Nav</h1>
        <StatusBar reports={reports} />
      </header>
      <p className="disclaimer" role="note">
        Prototype using <strong>simulated flood scenarios</strong>. Not real-time flood forecasting,
        not an emergency-dispatch system, and routes are not verified safe in the real world.
      </p>

      {error && (
        <div className="load-error" role="alert">
          <strong>Could not load map data.</strong> {error}
        </div>
      )}
      {!data && !error && <div className="loading">Loading map data…</div>}

      {data && route && (
        <main className="app-main">
          <div className="map-wrap">
            <MapView
              nodeById={data.nodeById}
              edgeById={data.edgeById}
              drawEdges={data.drawEdges}
              camps={data.camps}
              statuses={statuses}
              route={route}
              startId={startId}
              mode={mode}
              onPickStart={pickStart}
              selectedRoadId={selectedRoadId}
              onSelectRoad={setSelectedRoadId}
              reportedRoadIds={reports.reportedRoadIds}
              fit={fit}
            />
          </div>
          <aside className="sidebar">
            <ControlPanel
              scenarios={data.scenarios}
              level={level}
              onLevel={setLevel}
              route={route}
              statuses={statuses}
              drawEdges={data.drawEdges}
              mode={mode}
              onMode={setMode}
              onZoomRoute={zoomToRoute}
              warnings={data.warnings}
            />
            <ReportForm
              edgeById={data.edgeById}
              statuses={statuses}
              selectedRoadId={selectedRoadId}
              onSelectRoad={setSelectedRoadId}
              onPickOnMap={pickRoadOnMap}
              reports={reports}
            />
          </aside>
        </main>
      )}
    </div>
  )
}