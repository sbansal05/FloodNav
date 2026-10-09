// Adapter between the UI and Person 2's routing engine.
// If Person 2's function signature differs, only this file needs to change.
import { shortestPath } from './dijkstra.js'

/**
 * Finds the nearest reachable relief camp by graph distance.
 * @param graph        { nodes, edges }
 * @param blockedRoads array of blocked edge ids for the active flood scenario
 * @param startId      node id where the user is
 * @param camps        [{ id, name, nodeId, ... }]
 * @returns { path, distance, reachable, camp }  (camp is null when unreachable)
 */
export function computeBestRoute(graph, blockedRoads, startId, camps) {
  let best = null
  for (const camp of camps) {
    const result = shortestPath(graph, blockedRoads, startId, camp.nodeId)
    if (result.reachable && (best === null || result.distance < best.distance)) {
      best = { ...result, camp }
    }
  }
  return best ?? { path: [], distance: 0, reachable: false, camp: null }
}

export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(2)} km`
}
