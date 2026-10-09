// Run from the frontend folder:  node check-scenarios.mjs
import { readFileSync } from 'node:fs'

// Let src/lib/data.js "fetch" the files in public/data
globalThis.fetch = async (url) => {
  const body = readFileSync('public' + url, 'utf8')
  return { ok: true, status: 200, json: async () => JSON.parse(body) }
}
const { loadData } = await import('./src/lib/data.js')
const { computeBestRoute, pickDefaultStart } = await import('./src/lib/routing.js')

const raw = JSON.parse(readFileSync('public/data/scenarios.json', 'utf8'))
const list = Array.isArray(raw) ? raw : raw.scenarios
const d = await loadData()
const graph = { nodes: d.nodes, edges: d.edges }
const start = pickDefaultStart(graph, d.camps)

// reverse-direction twin of every two-way edge
const byDir = new Map(d.edges.map((e) => [`${e.from}>${e.to}`, e]))
const twinOf = (e) => (e.oneway === true ? null : byDir.get(`${e.to}>${e.from}`))

console.log(`Start node ${start}\n`)
const base = computeBestRoute(graph, [], start, d.camps)
console.log(`No flooding: ${base.camp.id}  ${Math.round(base.distance)} m  (${base.path.length - 1} segments)`)

for (const s of list) {
  const ids = s.blockedRoads ?? s.blockedRoadIds ?? s.blocked ?? []
  const set = new Set(ids)
  const missingTwins = ids
    .map((id) => d.edgeById.get(id))
    .filter((e) => e && twinOf(e) && !set.has(twinOf(e).id))
    .map((e) => `${e.id} (twin ${twinOf(e).id})`)
  // route using ONLY the IDs exactly as written in the file (no automatic twin closing)
  const r = computeBestRoute(graph, ids, start, d.camps)
  // route using the frontend's expanded list (twins added automatically)
  const expanded = d.scenarios.find((x) => x.id === (s.id ?? '')) ?? null
  const rx = expanded ? computeBestRoute(graph, expanded.blocked, start, d.camps) : null
  const fmt = (x) =>
    x.reachable ? `${x.camp.id}  ${Math.round(x.distance)} m  (${x.path.length - 1} segments)` : 'NO CAMP REACHABLE'
  console.log(`\n${s.label ?? s.name ?? s.id}: ${ids.length} blocked IDs`)
  console.log(`  both directions listed?  ${missingTwins.length === 0 ? 'YES' : 'NO, missing: ' + missingTwins.join(', ')}`)
  console.log(`  route (file IDs only):   ${fmt(r)}`)
  if (rx) console.log(`  route (twins auto-added): ${fmt(rx)}`)
}