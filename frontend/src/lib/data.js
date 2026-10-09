// Loads and normalises Person 1's JSON (roads.json, camps.json, scenarios.json).
// Tolerant of small format differences; problems are collected in `warnings`
// so integration issues are visible instead of silently breaking the map.

const base = import.meta.env?.BASE_URL ?? '/'

async function getJson(name) {
  const res = await fetch(`${base}data/${name}`)
  if (!res.ok) throw new Error(`Could not load ${name} (HTTP ${res.status})`)
  return res.json()
}

const rad = (d) => (d * Math.PI) / 180
export function haversine(a, b) {
  const R = 6371000
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Nearest road node to a point (fast flat-earth approximation, fine at city scale). */
export function nearestNode(nodes, lat, lng) {
  const k = Math.cos(rad(lat))
  let best = null
  let bestD = Infinity
  for (const n of nodes) {
    const dy = n.lat - lat
    const dx = (n.lng - lng) * k
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  return best
}

/**
 * Two-way roads can be stored as two directed edges with separate IDs. A flood
 * closes the physical road in both directions, so when a two-way edge is blocked
 * its opposite-direction twin is blocked too.
 */
function expandBlocked(blockedIds, edgeById, pairIndex) {
  const out = new Set(blockedIds)
  let added = 0
  for (const id of blockedIds) {
    const e = edgeById.get(id)
    if (!e || e.oneway === true) continue
    const twin = pairIndex.get(`${e.to}>${e.from}`)
    if (twin && twin.oneway !== true && !out.has(twin.id)) {
      out.add(twin.id)
      added++
    }
  }
  return { ids: [...out], added }
}

function normalizeScenarios(raw, edgeById, pairIndex, warnings) {
  const list = Array.isArray(raw) ? raw : (raw.scenarios ?? [])
  let addedAtMax = 0
  const mapped = list.map((s, i) => {
    const blocked = s.blockedRoads ?? s.blockedRoadIds ?? s.blocked ?? []
    const unknown = blocked.filter((id) => !edgeById.has(id))
    if (unknown.length) {
      warnings.push(
        `Scenario "${s.name ?? s.label ?? s.id ?? i + 1}" blocks unknown road IDs: ${unknown.join(', ')}`,
      )
    }
    const { ids, added } = expandBlocked(
      blocked.filter((id) => edgeById.has(id)),
      edgeById,
      pairIndex,
    )
    addedAtMax = Math.max(addedAtMax, added)
    return {
      id: s.id ?? `scenario-${i + 1}`,
      name: s.name ?? s.label ?? `Scenario ${i + 1}`,
      description: s.description ?? '',
      blocked: ids,
    }
  })
  if (addedAtMax > 0) {
    warnings.push(
      `Scenarios block only one direction of some two-way roads. The opposite-direction edge was blocked automatically (${addedAtMax} extra edges in the largest scenario). Listing both IDs in scenarios.json avoids this.`,
    )
  }
  // Slider position 0 is always the "no flooding" baseline.
  return [
    { id: 'normal', name: 'No flooding', description: 'Baseline: all roads open.', blocked: [] },
    ...mapped,
  ]
}

function normalizeCamps(raw, nodes, warnings) {
  const list = Array.isArray(raw) ? raw : (raw.camps ?? [])
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const byCoord = new Map(nodes.map((n) => [`${n.lat},${n.lng}`, n]))
  return list
    .map((c, i) => {
      const label = c.name ?? `camp ${i + 1}`
      let node = nodeById.get(c.nodeId ?? c.node) ?? byCoord.get(`${c.lat},${c.lng}`)
      if (!node) {
        if (c.lat == null || c.lng == null) {
          warnings.push(`Camp "${label}" has no valid node or coordinates and was skipped`)
          return null
        }
        // Snap the camp to the nearest road node so routing can reach it.
        node = nearestNode(nodes, c.lat, c.lng)
        const off = Math.round(haversine(c, node))
        if (off > 25) warnings.push(`Camp "${label}" was snapped to a road node ${off} m away`)
      }
      return {
        id: c.id ?? `camp-${i + 1}`,
        name: label,
        capacity: c.capacity ?? null,
        nodeId: node.id,
        lat: node.lat,
        lng: node.lng,
      }
    })
    .filter(Boolean)
}

export async function loadData() {
  const [roads, campsRaw, scenariosRaw] = await Promise.all([
    getJson('roads.json'),
    getJson('camps.json'),
    getJson('scenarios.json'),
  ])
  const warnings = []

  const nodes = roads.nodes ?? []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  let skipped = 0
  const edges = (roads.edges ?? []).filter((e) => {
    const ok = nodeById.has(e.from) && nodeById.has(e.to)
    if (!ok) skipped++
    return ok
  })
  if (skipped) warnings.push(`${skipped} roads referenced unknown nodes and were skipped`)
  if (!nodes.length || !edges.length) throw new Error('roads.json has no nodes or edges')

  const edgeById = new Map(edges.map((e) => [e.id, e]))
  const pairIndex = new Map(edges.map((e) => [`${e.from}>${e.to}`, e]))

  // Draw each physical road once (a two-way road is two directed edges).
  const drawEdges = edges.filter(
    (e) => e.oneway === true || !pairIndex.has(`${e.to}>${e.from}`) || e.from < e.to,
  )

  return {
    nodes,
    nodeById,
    edges,
    edgeById,
    drawEdges,
    camps: normalizeCamps(campsRaw, nodes, warnings),
    scenarios: normalizeScenarios(scenariosRaw, edgeById, pairIndex, warnings),
    warnings,
  }
}

/**
 * Road risk for the legend / map colours at a given slider level:
 *   blocked  - closed in the active scenario
 *   atrisk   - still open, but closes at the next flood level
 *   open     - open now and at the next level
 */
export function classifyRoads(edges, scenarios, level) {
  const now = new Set(scenarios[level].blocked)
  const next = new Set(scenarios[level + 1]?.blocked ?? [])
  return new Map(
    edges.map((e) => [e.id, now.has(e.id) ? 'blocked' : next.has(e.id) ? 'atrisk' : 'open']),
  )
}