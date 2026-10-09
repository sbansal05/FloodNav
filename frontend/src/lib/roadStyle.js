// Shared road-risk styling used by the map and the legend.
export const STATUS_STYLE = {
  open: { color: '#2e9e5b', label: 'Open', dashArray: null },
  atrisk: { color: '#e6a21a', label: 'At risk (closes at next level)', dashArray: '2 8' },
  blocked: { color: '#d64545', label: 'Blocked (flooded)', dashArray: '8 8' },
}

// Thin, muted lines for open roads keep a dense network readable;
// risky and blocked roads stand out.
export function lineStyle(status, selected) {
  const s = STATUS_STYLE[status]
  return {
    color: s.color,
    weight: selected ? 9 : status === 'open' ? 2.5 : status === 'atrisk' ? 4.5 : 5.5,
    opacity: status === 'open' && !selected ? 0.55 : 0.95,
    dashArray: s.dashArray,
  }
}