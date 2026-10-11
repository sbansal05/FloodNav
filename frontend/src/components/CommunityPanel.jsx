import { useEffect, useState } from 'react'
import { COMMUNITY_HOURS, COMMUNITY_STYLE, timeAgo } from '../lib/communityReports.js'

/** Side-panel section for other people's road reports. */
export default function CommunityPanel({ community, show, onShow, online }) {
  // Re-render every 30 s so "updated X min ago" stays current.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!community.enabled) return null

  const counts = { flooded: 0, blocked: 0, safe: 0 }
  for (const r of community.roads) counts[r.type]++
  const updated = community.fetchedAt ? timeAgo(community.fetchedAt, now) : null

  let status
  if (!online) {
    status = updated ? `Offline: showing reports from ${updated}` : 'Offline: no saved reports yet'
  } else if (community.error) {
    status = updated
      ? `${community.error}. Showing reports from ${updated}`
      : `${community.error}. Will retry.`
  } else if (community.loading && !updated) {
    status = 'Loading…'
  } else {
    status = updated ? `Updated ${updated}` : 'Not loaded yet'
  }

  return (
    <section className="panel" aria-labelledby="community-heading">
      <h2 id="community-heading">Community reports</h2>
      <label className="check-row">
        <input type="checkbox" checked={show} onChange={(e) => onShow(e.target.checked)} />
        Show on map ({community.roads.length} road{community.roads.length === 1 ? '' : 's'}, last{' '}
        {COMMUNITY_HOURS} h)
      </label>
      <ul className="legend">
        {Object.entries(COMMUNITY_STYLE).map(([type, s]) => (
          <li key={type}>
            <span className="community-dot" style={{ background: s.color }}>
              {s.symbol}
            </span>
            {s.label} <span className="muted">({counts[type]})</span>
          </li>
        ))}
      </ul>
      <p className={`muted small ${!online || community.error ? 'stale' : ''}`} role="status">
        {status}
        {online && (
          <>
            {' · '}
            <button
              type="button"
              className="link"
              onClick={community.refresh}
              disabled={community.loading}
            >
              {community.loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </>
        )}
      </p>
      <p className="muted small">
        Unverified reports from app users. They are shown for awareness only and do not change the
        recommended route.
      </p>
    </section>
  )
}