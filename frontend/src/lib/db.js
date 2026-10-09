// IndexedDB storage for road reports that could not be sent yet (offline queue).
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
  await db.put(STORE, { ...report, status: 'pending', createdAt: Date.now() })
}

export async function getPending() {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function updatePending(item) {
  const db = await getDb()
  await db.put(STORE, item)
}

export async function removePending(reportId) {
  const db = await getDb()
  await db.delete(STORE, reportId)
}