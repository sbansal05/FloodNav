import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import ReportForm from './components/ReportForm.jsx'
import StatusBar from './components/StatusBar.jsx'
import { classifyRoads, loadData } from './lib/data.js'
import { computeBestRoute } from './lib/routing.js'
import { useReports } from './hooks/useReports.js'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const [startId, setStartId] = useState(null)
  const [selectedRoadId, setSelectedRoadId] = useState('')
  const reports = useReports()

  useEffect(() => {
    loadData()
      .then((d) => {
        setData(d)
        setStartId(d.nodes[0].id)
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Flood Relief Planner</h1>
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
              nodes={data.nodes}
              edges={data.edges}
              camps={data.camps}
              statuses={statuses}
              route={route}
              startId={startId}
              onSetStart={setStartId}
              selectedRoadId={selectedRoadId}
              onSelectRoad={setSelectedRoadId}
              reportedRoadIds={reports.reportedRoadIds}
            />
          </div>
          <aside className="sidebar">
            <ControlPanel
              scenarios={data.scenarios}
              level={level}
              onLevel={setLevel}
              route={route}
              startId={startId}
              statuses={statuses}
              warnings={data.warnings}
            />
            <ReportForm
              edges={data.edges}
              selectedRoadId={selectedRoadId}
              onSelectRoad={setSelectedRoadId}
              reports={reports}
            />
          </aside>
        </main>
      )}
    </div>
  )
}
