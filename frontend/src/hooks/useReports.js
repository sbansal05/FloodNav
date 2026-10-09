import { useCallback, useEffect, useRef, useState } from 'react'
import { addPending, getPending, removePending, updatePending } from '../lib/db.js'
import { apiConfigured, postReport } from '../lib/api.js'

// Must match Person 4's API: flooded / blocked / safe
export const REPORT_TYPES = [
  { value: 'flooded', label: 'Flooded' },
  { value: 'blocked', label: 'Blocked / impassable' },
  { value: 'safe', label: 'Safe / passable' },
]
export const MAX_DESCRIPTION = 200
const RETRY_EVERY_MS = 30_000

function newReportId() {
  const uid = globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `rpt-${uid}`
}

/**
 * Report submission with an offline queue.
 *  - online + backend configured -> POST immediately
 *  - not confirmed (offline, network error, any reply other than 201 / 200+duplicate)
 *    -> saved in IndexedDB and retried: on reconnect, every 30 s, or via "Sync now"
 */
export function useReports() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pending, setPending] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [sentRoadIds, setSentRoadIds] = useState(() => new Set())
  const syncingRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      setPending(await getPending())
    } catch {
      setPending([])
    }
  }, [])

  const markSent = useCallback((roadId) => {
    setSentRoadIds((prev) => new Set(prev).add(roadId))
  }, [])

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine || !apiConfigured) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const items = await getPending()
      for (const item of items) {
        try {
          await postReport(item)
          await removePending(item.reportId) // confirmed saved: drop from the queue
          markSent(item.roadId)
        } catch (err) {
          if (err.status === undefined) break // can't reach the server: stop, retry later
          // Server replied but did not confirm: keep it and retry later.
          await updatePending({ ...item, lastError: `Not saved yet (HTTP ${err.status})` })
        }
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      await refresh()
    }
  }, [refresh, markSent])

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      syncNow()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    refresh().then(syncNow)
    const timer = setInterval(syncNow, RETRY_EVERY_MS)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(timer)
    }
  }, [refresh, syncNow])

  /** @returns {{status: 'sent'|'queued', reason?: 'no-backend'|'offline'|'network'|'server'}} */
  const submit = useCallback(
    async ({ roadId, type, description }) => {
      const report = {
        reportId: newReportId(),
        roadId,
        type,
        description: description.trim(),
        createdAt: new Date().toISOString(),
      }
      let reason = !apiConfigured ? 'no-backend' : navigator.onLine ? 'network' : 'offline'

      if (navigator.onLine && apiConfigured) {
        try {
          await postReport(report)
          markSent(roadId)
          return { status: 'sent' }
        } catch (err) {
          reason = err.status === undefined ? 'network' : 'server'
          if (err.status !== undefined) report.lastError = `Not saved yet (HTTP ${err.status})`
        }
      }

      await addPending(report)
      await refresh()
      return { status: 'queued', reason }
    },
    [refresh, markSent],
  )

  const discard = useCallback(
    async (reportId) => {
      await removePending(reportId)
      await refresh()
    },
    [refresh],
  )

  const reportedRoadIds = new Set([...sentRoadIds, ...pending.map((p) => p.roadId)])

  return { online, apiConfigured, pending, syncing, syncNow, submit, discard, reportedRoadIds }
}