// Shared road styling used by the map and the legend.
// Priority when a road has several states: blocked > pending > citizen > atrisk > open.
export const STATUS_STYLE = {
  open: { color: '#2e9e5b', label: 'Open', dashArray: null },
  atrisk: { color: '#eab308', label: 'At risk (closes at next level)', dashArray: null },
  blocked: { color: '#d64545', label: 'Flooded (simulated scenario)', dashArray: null },
  citizen: { color: '#ea580c', label: 'Blocked by citizen reports (not verified)', dashArray: '10 7' },
  pending: { color: '#ea580c', label: 'Your report (pending sync)', dashArray: '2 6' },
}

const WEIGHT = { open: 2.5, atrisk: 4, blocked: 5.5, citizen: 6, pending: 6 }

// Thin, muted lines for open roads keep a dense network readable;
// risky and blocked roads stand out.
export function lineStyle(status, selected) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.open
  return {
    color: s.color,
    weight: selected ? 9 : (WEIGHT[status] ?? 2.5),
    opacity: status === 'open' && !selected ? 0.55 : 0.95,
    dashArray: s.dashArray,
    lineCap: s.dashArray ? 'butt' : 'round',
  }
}