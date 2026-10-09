// IndexedDB storage for road reports that are not confirmed by the server yet (offline queue).
import { openDB } from 'idb'

const DB_NAME = 'flood-relief'
const STORE = 'pendingReports'

let dbPromise
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'reportId' })
      },
    })
  }
  return dbPromise
}

export async function addPending(report) {
  const db = await getDb()
  // queuedAt is local bookkeeping only; createdAt (ISO) is what the server receives.
  await db.put(STORE, { ...report, queuedAt: Date.now() })
}

export async function getPending() {
  const db = await getDb()
  const all = await db.getAll(STORE)
  const order = (r) => r.queuedAt ?? (typeof r.createdAt === 'number' ? r.createdAt : 0)
  return all.sort((a, b) => order(a) - order(b))
}

export async function updatePending(item) {
  const db = await getDb()
  await db.put(STORE, item)
}

export async function removePending(reportId) {
  const db = await getDb()
  await db.delete(STORE, reportId)
}