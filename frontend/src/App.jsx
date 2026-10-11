import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import ReportForm from './components/ReportForm.jsx'
import StatusBar from './components/StatusBar.jsx'
import CommunityPanel from './components/CommunityPanel.jsx'
import { classifyRoads, loadData, nearestNode } from './lib/data.js'
import { computeBestRoute, pickDefaultStart } from './lib/routing.js'
import { buildCitizenRoads, combineBlocked } from './lib/citizenBlocking.js'
import { timeAgo } from './lib/communityReports.js'
import { useReports } from './hooks/useReports.js'
import { useCommunityReports } from './hooks/useCommunityReports.js'

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

  const community = useCommunityReports(data?.edgeById)
  const refreshCommunity = community.refresh

  // After the server confirms one of our reports, fetch the community view again so it appears.
  useEffect(() => {
    if (!reports.lastSavedAt) return
    const t = setTimeout(refreshCommunity, 1000)
    return () => clearTimeout(t)
  }, [reports.lastSavedAt, refreshCommunity])

  const scenario = data?.scenarios[level]

  // Citizen reports (server data + reports just sent + our own unsynced reports), in the API's shape.
  const citizenRoads = useMemo(
    () =>
      buildCitizenRoads(community.roads, community.fetchedAt, reports.recentSent, reports.pending),
    [community.roads, community.fetchedAt, reports.recentSent, reports.pending],
  )

  // Scenario closures + citizen-blocked roads (both directions) -> one array for Dijkstra.
  const blocking = useMemo(
    () => (data ? combineBlocked(scenario.blocked, citizenRoads, data) : null),
    [data, scenario, citizenRoads],
  )

  const statuses = useMemo(() => {
    if (!data) return new Map()
    const s = classifyRoads(data.edges, data.scenarios, level)
    // Scenario flooding (red) stays on top; otherwise show the citizen / pending block (orange).
    for (const id of blocking.citizenIds) if (s.get(id) !== 'blocked') s.set(id, 'citizen')
    for (const id of blocking.pendingIds) if (s.get(id) !== 'blocked') s.set(id, 'pending')
    return s
  }, [data, level, blocking])

  // Dijkstra runs in the browser, so this works offline.
  const route = useMemo(() => {
    if (!data || !startId) return null
    return computeBestRoute(
      { nodes: data.nodes, edges: data.edges },
      [...blocking.blocked],
      startId,
      data.camps,
    )
  }, [data, blocking, startId])

  // Text shown when a road is tapped (null = no label for this road).
  const describeRoad = useCallback(
    (edgeId) => {
      const info = blocking?.infoByEdge.get(edgeId)
      const scenarioFlooded = statuses.get(edgeId) === 'blocked'
      if (info?.pending) return `Your report: ${info.latestType} · Pending sync`
      if (info) {
        const count = info.reportCount || 1
        const label = `Reported ${info.latestType} by citizens · ${timeAgo(info.lastReportedAt)} · ${count} report${count === 1 ? '' : 's'} · Not verified`
        return scenarioFlooded ? `Flooded in this simulated scenario. Also: ${label}` : label
      }
      if (scenarioFlooded) return `Flooded in this simulated scenario (road ${edgeId})`
      return null
    },
    [blocking, statuses],
  )

  const counts = useMemo(() => {
    const c = { citizen: 0, pending: 0 }
    for (const e of data?.drawEdges ?? []) {
      const st = statuses.get(e.id)
      if (st === 'citizen' || st === 'pending') c[st]++
    }
    return c
  }, [data, statuses])

  // "Safe" reports don't block anything; they are shown as markers for awareness.
  const safeReports = useMemo(
    () => community.roads.filter((r) => r.type === 'safe'),
    [community.roads],
  )

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
        <h1>FloodNav</h1>
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
              communityRoads={safeReports}
              describeRoad={describeRoad}
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
            <CommunityPanel
              community={community}
              online={reports.online}
              citizenCount={counts.citizen}
              pendingCount={counts.pending}
              safeCount={safeReports.length}
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