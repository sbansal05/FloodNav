import { useCallback, useEffect, useRef, useState } from 'react'
import { addPending, getPending, removePending, updatePending } from '../lib/db.js'
import { apiConfigured, postReport, toPayload } from '../lib/api.js'

export const REPORT_TYPES = [
  { value: 'flooded', label: 'Flooded' },
  { value: 'blocked', label: 'Blocked / impassable' },
  { value: 'damaged', label: 'Damaged' },
]
export const MAX_DESCRIPTION = 200

function newReportId() {
  const uid = globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `rpt-${uid}`
}

/**
 * Report submission with an offline queue.
 *  - online + backend configured -> POST immediately
 *  - otherwise (or on network/5xx failure) -> saved in IndexedDB, synced later
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
        if (item.status === 'failed') continue
        try {
          await postReport(item)
          await removePending(item.reportId)
          markSent(item.roadId)
        } catch (err) {
          if (err.status >= 400 && err.status < 500) {
            // Server rejected this report: keep it visible, don't retry forever.
            await updatePending({ ...item, status: 'failed', error: `Rejected (HTTP ${err.status})` })
          } else {
            break // network / server problem: stop and retry later
          }
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
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [refresh, syncNow])

  /** @returns {{status: 'sent'|'queued'|'rejected', reason?: string, message?: string}} */
  const submit = useCallback(
    async ({ roadId, type, description }) => {
      const report = { reportId: newReportId(), roadId, type, description: description.trim() }

      if (navigator.onLine && apiConfigured) {
        try {
          await postReport(report)
          markSent(roadId)
          return { status: 'sent' }
        } catch (err) {
          if (err.status >= 400 && err.status < 500) {
            return { status: 'rejected', message: `The server rejected this report (HTTP ${err.status}).` }
          }
          // network error or 5xx: fall through and queue it
        }
      }

      await addPending(toPayload(report))
      await refresh()
      return {
        status: 'queued',
        reason: !apiConfigured ? 'no-backend' : navigator.onLine ? 'network' : 'offline',
      }
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
