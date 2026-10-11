import { useCallback, useEffect, useRef, useState } from 'react'
import { getCached, setCached } from '../lib/db.js'
import {
  COMMUNITY_HOURS,
  communityConfigured,
  fetchCommunityReports,
  normalizeRoads,
} from '../lib/communityReports.js'

const CACHE_KEY = 'communityReports'
const REFRESH_EVERY_MS = 45_000


export function useCommunityReports(edgeById) {
  const [roads, setRoads] = useState([])
  const [fetchedAt, setFetchedAt] = useState(null) // ms of the last successful fetch
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const busy = useRef(false)

  const apply = useCallback(
    (body, at) => {
      setRoads(normalizeRoads(body, edgeById))
      setFetchedAt(at)
    },
    [edgeById],
  )

  const refresh = useCallback(async () => {
    if (!communityConfigured || !edgeById || busy.current || !navigator.onLine) return
    busy.current = true
    setLoading(true)
    try {
      const body = await fetchCommunityReports(COMMUNITY_HOURS)
      const at = Date.now()
      apply(body, at)
      setError(null)
      await setCached(CACHE_KEY, { body, fetchedAt: at }).catch(() => {})
    } catch (err) {
      console.warn('[community reports] fetch failed', err)
      setError(err.status ? `Server error (HTTP ${err.status})` : 'Could not reach the server')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [apply, edgeById])

  useEffect(() => {
    if (!communityConfigured || !edgeById) return
    let cancelled = false
    // Show the last known reports immediately, then try for fresh ones.
    getCached(CACHE_KEY)
      .then((cached) => {
        if (!cancelled && cached?.body) apply(cached.body, cached.fetchedAt)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) refresh()
      })

    let reconnectTimer
    const goOnline = () => {
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(refresh, 1500) // let the connection settle first
    }
    window.addEventListener('online', goOnline)
    const timer = setInterval(refresh, REFRESH_EVERY_MS)
    return () => {
      cancelled = true
      window.removeEventListener('online', goOnline)
      clearInterval(timer)
      clearTimeout(reconnectTimer)
    }
  }, [apply, refresh, edgeById])

  return { enabled: communityConfigured, roads, fetchedAt, error, loading, refresh }
}