// STAND-IN for Person 2's dijkstra.js so the UI can be built and demoed in parallel.
// When Person 2 delivers, replace this file (or change the import in routing.js).
//
// Contract (from the shared interface):
//   shortestPath(graph, blockedRoads, startId, endId)
//     graph        { nodes: [{id, lat, lng}], edges: [{id, from, to, distance}] }  (bidirectional)
//     blockedRoads array of edge ids to exclude, e.g. ["BC"]
//   returns        { path: ["A","B","C"], distance: 500, reachable: true }
//                  { path: [], distance: 0, reachable: false }   when no route exists

export function shortestPath(graph, blockedRoads, startId, endId) {
  const blocked = new Set(blockedRoads)
  const adj = new Map(graph.nodes.map((n) => [n.id, []]))
  for (const e of graph.edges) {
    if (blocked.has(e.id)) continue
    adj.get(e.from)?.push({ to: e.to, w: e.distance })
    adj.get(e.to)?.push({ to: e.from, w: e.distance })
  }

  if (!adj.has(startId) || !adj.has(endId)) {
    return { path: [], distance: 0, reachable: false }
  }

  const dist = new Map([[startId, 0]])
  const prev = new Map()
  const done = new Set()

  // Graph is tiny (demo area), so a linear scan for the minimum is fine here.
  while (true) {
    let u = null
    let best = Infinity
    for (const [id, d] of dist) {
      if (!done.has(id) && d < best) {
        best = d
        u = id
      }
    }
    if (u === null) break
    if (u === endId) break
    done.add(u)
    for (const { to, w } of adj.get(u)) {
      const nd = best + w
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        prev.set(to, u)
      }
    }
  }

  if (!dist.has(endId)) return { path: [], distance: 0, reachable: false }

  const path = [endId]
  while (path[0] !== startId) path.unshift(prev.get(path[0]))
  return { path, distance: dist.get(endId), reachable: true }
}
