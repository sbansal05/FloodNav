// The UI only ever calls computeBestRoute, so if the module's interface changes only this file does.
import { findNearestReachableCamp } from '../../../src/algorithms/reliefCamps.js'

/**
 * Finds the nearest reachable relief camp by road distance.
 * @param graph        { nodes, edges }
 * @param blockedRoads blocked edge ids of the selected flood scenario (also used for map styling)
 * @param startId      node id where the user is
 * @param camps        [{ id, name, nodeId, lat, lng }]
 * @returns { path, distance, reachable, camp }  (unreachable: path [], distance 0, camp null)
 */
export function computeBestRoute(graph, blockedRoads, startId, camps) {
  const engineCamps = camps.map((c) => ({ ...c, id: c.nodeId }))
  const r = findNearestReachableCamp(graph, startId, engineCamps, blockedRoads)
  if (!r?.reachable || !r.camp || !Array.isArray(r.path) || r.path.length === 0) {
    return { path: [], distance: 0, reachable: false, camp: null }
  }
  const camp = camps.find((c) => c.nodeId === r.camp.id) ?? null
  return { path: r.path, distance: r.distance, reachable: true, camp }
}

/**
 * A sensible starting junction: the node closest to the middle of the map that
 * is not a camp and can reach a camp when nothing is flooded.
 */
export function pickDefaultStart(graph, camps) {
  const n = graph.nodes.length
  const lat = graph.nodes.reduce((s, p) => s + p.lat, 0) / n
  const lng = graph.nodes.reduce((s, p) => s + p.lng, 0) / n
  const campNodes = new Set(camps.map((c) => c.nodeId))
  const d2 = (p) => (p.lat - lat) ** 2 + (p.lng - lng) ** 2
  const candidates = [...graph.nodes].sort((a, b) => d2(a) - d2(b)).slice(0, 60)
  for (const node of candidates) {
    if (campNodes.has(node.id)) continue
    if (computeBestRoute(graph, [], node.id, camps).reachable) return node.id
  }
  return graph.nodes[0].id
}

export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(2)} km`
}