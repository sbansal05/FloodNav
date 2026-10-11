import { getBlockedRoads } from '../../../src/algorithms/blockedRoads.js'
import { expandBlocked } from './data.js'

/**
 * Builds the citizenRoads object passed to getBlockedRoads, in the API's `data.roads` shape:
 *   { [roadId]: { latestType, lastReportedAt (ms), reportCount, pending?, justSent? } }
 * Later sources win: server data < reports we just sent < our own unsynced reports.
 */
export function buildCitizenRoads(communityRoads, fetchedAt, recentSent, pending) {
  const out = {}
  for (const r of communityRoads) {
    out[r.roadId] = { latestType: r.type, lastReportedAt: r.lastReportedAt, reportCount: r.reportCount }
  }
  for (const [roadId, s] of Object.entries(recentSent ?? {})) {
    if (fetchedAt && fetchedAt > s.at) continue // the server data already includes it
    out[roadId] = {
      latestType: s.type,
      lastReportedAt: s.at,
      reportCount: (out[roadId]?.reportCount ?? 0) + 1,
      justSent: true,
    }
  }
  for (const p of pending ?? []) {
    const at = typeof p.createdAt === 'number' ? p.createdAt : Date.parse(p.createdAt)
    out[p.roadId] = {
      latestType: p.type,
      lastReportedAt: Number.isNaN(at) ? Date.now() : at,
      reportCount: out[p.roadId]?.reportCount ?? 0,
      pending: true,
    }
  }
  return out
}

/**
 * @param scenarioBlocked edge IDs closed by the selected scenario (already includes twins)
 * @param citizenRoads    output of buildCitizenRoads
 * @param data            { edgeById, pairIndex, validRoadIds } from loadData()
 * @returns {{
 *   blocked: string[],               // array for Dijkstra: scenario + citizen, both directions
 *   citizenIds: Set<string>,         // citizen-blocked edges (both directions), confirmed reports
 *   pendingIds: Set<string>,         // edges blocked only by our own unsynced reports
 *   infoByEdge: Map<string, object>, // edge ID (incl. twins) -> the citizen report entry
 *   ignored: string[],
 * }}
 */
export function combineBlocked(scenarioBlocked, citizenRoads, data) {
  const { citizenBlocked, ignored } = getBlockedRoads(scenarioBlocked, citizenRoads, data.validRoadIds)

  const citizenIds = new Set()
  const pendingIds = new Set()
  const infoByEdge = new Map()
  for (const roadId of citizenBlocked) {
    const entry = { roadId, ...citizenRoads[roadId] }
    const { ids } = expandBlocked([roadId], data.edgeById, data.pairIndex) // [roadId, twin?]
    for (const id of ids) {
      ;(entry.pending ? pendingIds : citizenIds).add(id)
      infoByEdge.set(id, entry)
    }
  }

  const blocked = [...new Set([...scenarioBlocked, ...citizenIds, ...pendingIds])]
  return { blocked, citizenIds, pendingIds, infoByEdge, ignored }
}