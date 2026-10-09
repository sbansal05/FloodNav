import { STATUS_STYLE } from '../lib/roadStyle.js'
import { formatDistance } from '../lib/routing.js'

function Swatch({ color, dashed }) {
  return (
    <span
      className="swatch"
      style={{
        background: dashed
          ? `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 10px)`
          : color,
      }}
    />
  )
}

function RouteSummary({ route, onZoomRoute }) {
  if (!route.reachable) {
    return (
      <div className="route-card unreachable" role="status">
        <strong>No reachable relief camp</strong>
        <p>
          Every route from your start point to a camp is cut off in this scenario. Try another
          start point or a lower flood level.
        </p>
      </div>
    )
  }
  const atCamp = route.path.length === 1
  return (
    <div className="route-card" role="status">
      <strong>{route.camp.name}</strong>
      {atCamp ? (
        <p>You are already at this camp.</p>
      ) : (
        <p>
          <span className="big">{formatDistance(route.distance)}</span> along {route.path.length - 1}{' '}
          road segments
        </p>
      )}
      {!atCamp && (
        <button type="button" className="link" onClick={onZoomRoute}>
          Zoom to route
        </button>
      )}
    </div>
  )
}

export default function ControlPanel({
  scenarios,
  level,
  onLevel,
  route,
  statuses,
  drawEdges,
  mode,
  onMode,
  onZoomRoute,
  warnings,
}) {
  const scenario = scenarios[level]
  const counts = { open: 0, atrisk: 0, blocked: 0 }
  for (const e of drawEdges) counts[statuses.get(e.id) ?? 'open']++

  return (
    <section className="panel" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Flood scenario</h2>
      <label htmlFor="flood-level" className="level-name">
        {scenario.name}
      </label>
      <input
        id="flood-level"
        type="range"
        min={0}
        max={scenarios.length - 1}
        step={1}
        value={level}
        onChange={(e) => onLevel(Number(e.target.value))}
        aria-valuetext={scenario.name}
      />
      <div className="ticks" aria-hidden="true">
        {scenarios.map((s, i) => (
          <span key={s.id} className={i === level ? 'on' : ''}>
            {i}
          </span>
        ))}
      </div>
      {scenario.description && <p className="muted small">{scenario.description}</p>}
      <p className="muted small">
        {counts.blocked} of {drawEdges.length} roads blocked (simulated)
      </p>

      <h2>Recommended route</h2>
      <RouteSummary route={route} onZoomRoute={onZoomRoute} />

      <h2>Map click action</h2>
      <div className="seg" role="radiogroup" aria-label="Map click action">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'start'}
          className={mode === 'start' ? 'on' : ''}
          onClick={() => onMode('start')}
        >
          Set my start point
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'road'}
          className={mode === 'road' ? 'on' : ''}
          onClick={() => onMode('road')}
        >
          Select a road
        </button>
      </div>

      <h2>Road-risk legend</h2>
      <ul className="legend">
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <li key={key}>
            <Swatch color={s.color} dashed={!!s.dashArray} />
            {s.label} <span className="muted">({counts[key]})</span>
          </li>
        ))}
        <li>
          <Swatch color="#1f6feb" />
          Recommended route
        </li>
        <li>
          <Swatch color="#7b4bd6" />
          Road you reported
        </li>
        <li>
          <span className="legend-camp">CAMP</span>
          Relief camp (simulated)
        </li>
      </ul>

      {warnings.length > 0 && (
        <details className="warnings">
          <summary>Data notes ({warnings.length})</summary>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}