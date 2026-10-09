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

function normalizeScenarios(raw, edgeIds, warnings) {
  const list = Array.isArray(raw) ? raw : (raw.scenarios ?? [])
  const mapped = list.map((s, i) => {
    const blocked = s.blockedRoads ?? s.blockedRoadIds ?? s.blocked ?? []
    const unknown = blocked.filter((id) => !edgeIds.has(id))
    if (unknown.length) {
      warnings.push(
        `Scenario "${s.name ?? s.id ?? i + 1}" blocks unknown road IDs: ${unknown.join(', ')}`,
      )
    }
    return {
      id: s.id ?? `scenario-${i + 1}`,
      name: s.name ?? s.label ?? `Scenario ${i + 1}`,
      description: s.description ?? '',
      blocked: blocked.filter((id) => edgeIds.has(id)),
    }
  })
  // Slider position 0 is always the "no flooding" baseline.
  return [
    { id: 'normal', name: 'No flooding', description: 'Baseline: all roads open.', blocked: [] },
    ...mapped,
  ]
}

function normalizeCamps(raw, nodes, warnings) {
  const list = Array.isArray(raw) ? raw : (raw.camps ?? [])
  const nodeIds = new Set(nodes.map((n) => n.id))
  return list
    .map((c, i) => {
      let nodeId = c.nodeId ?? c.node
      if (!nodeIds.has(nodeId)) {
        if (c.lat == null || c.lng == null) {
          warnings.push(`Camp "${c.name ?? i + 1}" has no valid node or coordinates and was skipped`)
          return null
        }
        // Snap the camp to the nearest road node so routing can reach it.
        nodeId = nodes.reduce((best, n) => (haversine(c, n) < haversine(c, best) ? n : best)).id
        warnings.push(`Camp "${c.name ?? i + 1}" was snapped to nearest node ${nodeId}`)
      }
      const node = nodes.find((n) => n.id === nodeId)
      return {
        id: c.id ?? `camp-${i + 1}`,
        name: c.name ?? `Relief camp ${i + 1}`,
        capacity: c.capacity ?? null,
        nodeId,
        lat: c.lat ?? node.lat,
        lng: c.lng ?? node.lng,
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
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = (roads.edges ?? []).filter((e) => {
    const ok = nodeIds.has(e.from) && nodeIds.has(e.to)
    if (!ok) warnings.push(`Road ${e.id} references an unknown node and was skipped`)
    return ok
  })
  if (!nodes.length || !edges.length) throw new Error('roads.json has no nodes or edges')

  const edgeIds = new Set(edges.map((e) => e.id))
  return {
    nodes,
    edges,
    camps: normalizeCamps(campsRaw, nodes, warnings),
    scenarios: normalizeScenarios(scenariosRaw, edgeIds, warnings),
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
