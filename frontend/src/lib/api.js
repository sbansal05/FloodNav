// Report submission client (Person 4's API Gateway -> Lambda -> DynamoDB).
// Set the full POST URL in frontend/.env as VITE_REPORTS_ENDPOINT.
// Without it the app still works: reports are kept in the local queue.
//
// Contract (Person 4):
//   POST JSON { reportId, roadId, type: 'flooded' | 'blocked' | 'safe', description?, createdAt? }
//   201                          -> saved
//   200 with { duplicate: true } -> already saved earlier (also counts as saved)
//   anything else                -> not saved: keep it in the offline queue and retry later

const ENDPOINT = import.meta.env?.VITE_REPORTS_ENDPOINT

export const apiConfigured = Boolean(ENDPOINT)

/** The JSON body sent to the backend. */
export function toPayload({ reportId, roadId, type, description, createdAt }) {
  const payload = { reportId, roadId, type }
  if (description) payload.description = description
  // Older queued reports stored createdAt as a number; always send ISO text.
  if (createdAt != null) {
    payload.createdAt = typeof createdAt === 'number' ? new Date(createdAt).toISOString() : createdAt
  }
  return payload
}

/**
 * Resolves only when the server confirms the report is saved.
 * Throws otherwise: `err.status` is set for an HTTP reply, and is undefined
 * when the request never reached the server (offline / network error).
 */
export async function postReport(report) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(report)),
  })
  const body = await res.json().catch(() => null)
  if (res.status === 201 || (res.status === 200 && body?.duplicate === true)) {
    return body ?? {}
  }
  const err = new Error(`HTTP ${res.status}`)
  err.status = res.status
  throw err
}