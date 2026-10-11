const ENDPOINT = import.meta.env?.VITE_REPORTS_ENDPOINT

export const communityConfigured = Boolean(ENDPOINT)
export const COMMUNITY_HOURS = 24

export const COMMUNITY_STYLE = {
  flooded: { color: '#0e7490', symbol: '≈', label: 'Reported flooded' },
  blocked: { color: '#1f2937', symbol: '✕', label: 'Reported blocked' },
  safe: { color: '#15803d', symbol: '✓', label: 'Reported safe' },
}

/** Server timestamps have microseconds ("…:30.696701+00:00"); trim to milliseconds before parsing. */
export function parseTime(text) {
  if (!text) return null
  const ms = Date.parse(String(text).replace(/(\.\d{3})\d+/, '$1'))
  return Number.isNaN(ms) ? null : ms
}

export function timeAgo(ms, now = Date.now()) {
  if (ms == null) return 'unknown time'
  const minutes = Math.max(0, Math.round((now - ms) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

/**
 * Keeps only roads that exist in our map and have a known type, in a compact shape:
 * [{ roadId, type, lastReportedAt (ms), reportCount }]
 */
export function normalizeRoads(body, edgeById) {
  const roads = body?.roads ?? body?.data?.roads ?? {}
  const out = []
  for (const [roadId, r] of Object.entries(roads)) {
    if (!edgeById.has(roadId) || !COMMUNITY_STYLE[r?.latestType]) continue
    out.push({
      roadId,
      type: r.latestType,
      lastReportedAt: parseTime(r.lastReportedAt),
      reportCount: Number(r.reportCount) || 1,
    })
  }
  return out
}

/** Throws on network errors and non-2xx replies. */
export async function fetchCommunityReports(hours = COMMUNITY_HOURS) {
  const url = `${ENDPOINT}${ENDPOINT.includes('?') ? '&' : '?'}hours=${hours}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}