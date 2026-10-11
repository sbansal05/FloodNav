import { useEffect, useState } from 'react'
import { COMMUNITY_HOURS, timeAgo } from '../lib/communityReports.js'
import { STATUS_STYLE } from '../lib/roadStyle.js'

/** Side-panel section for citizen road reports (from GET /reports, cached for offline). */
export default function CommunityPanel({ community, online, citizenCount, pendingCount, safeCount }) {
  // Re-render every 30 s so "last updated X min ago" stays current.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!community.enabled) return null

  const updated = community.fetchedAt ? timeAgo(community.fetchedAt, now) : null
  let status
  if (!online) {
    status = updated ? `Offline. Reports last updated ${updated}` : 'Offline. No saved reports yet'
  } else if (community.error) {
    status = updated
      ? `${community.error}. Reports last updated ${updated}`
      : `${community.error}. Will retry.`
  } else if (community.loading && !updated) {
    status = 'Loading reports…'
  } else {
    status = updated ? `Reports last updated ${updated}` : 'Reports not loaded yet'
  }

  return (
    <section className="panel" aria-labelledby="community-heading">
      <h2 id="community-heading">Citizen reports (last {COMMUNITY_HOURS} h)</h2>
      <ul className="legend">
        <li>
          <span className="swatch" style={dash(STATUS_STYLE.citizen)} />
          Blocked by citizen reports <span className="muted">({citizenCount})</span>
        </li>
        <li>
          <span className="swatch" style={dash(STATUS_STYLE.pending)} />
          Your reports, pending sync <span className="muted">({pendingCount})</span>
        </li>
        <li>
          <span className="community-dot" style={{ background: '#15803d' }}>
            ✓
          </span>
          Reported safe <span className="muted">({safeCount})</span>
        </li>
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
        The recommended route avoids roads that citizens report as flooded or blocked. Reports are
        not verified. Tap an orange road for details.
      </p>
    </section>
  )
}

function dash({ color, dashArray }) {
  const [on, off] = dashArray.split(' ').map(Number)
  return {
    background: `repeating-linear-gradient(90deg, ${color} 0 ${on}px, transparent ${on}px ${on + off}px)`,
  }
}