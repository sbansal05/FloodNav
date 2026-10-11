// IndexedDB storage:
//  - pendingReports: road reports not confirmed by the server yet (offline queue)
//  - cache: last known server data (e.g. community road reports) for offline use
import { openDB } from 'idb'

const DB_NAME = 'flood-relief'
const STORE = 'pendingReports'
const CACHE = 'cache'

let dbPromise
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db) {
        // Version 1 created pendingReports; version 2 adds cache. Existing data is kept.
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'reportId' })
        if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE)
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

export async function getCached(key) {
  const db = await getDb()
  return db.get(CACHE, key)
}

export async function setCached(key, value) {
  const db = await getDb()
  await db.put(CACHE, value, key)
}