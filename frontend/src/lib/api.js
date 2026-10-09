// Report submission client (Person 4's API Gateway -> Lambda -> DynamoDB).
// Set the full POST URL in .env as VITE_REPORTS_ENDPOINT.
// Without it the app still works: reports are kept in the local queue.

const ENDPOINT = import.meta.env?.VITE_REPORTS_ENDPOINT

export const apiConfigured = Boolean(ENDPOINT)

/** Payload sent to the backend: { reportId, roadId, type, description } */
export function toPayload({ reportId, roadId, type, description }) {
  return { reportId, roadId, type, description }
}

/**
 * Throws an Error with `.status` set for HTTP failures (4xx = rejected,
 * 5xx = retry later). Network failures throw without `.status`.
 */
export async function postReport(report) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(report)),
  })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => ({}))
}