# Flood Relief Planner: Frontend (Person 3)

React + Vite + Leaflet PWA. Dijkstra runs **in the browser**, so routing works offline.
This is a prototype using **simulated flood scenarios**, not real-time forecasting, and routes are not
verified safe in the real world.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build + service worker (offline support only works in the build)
npm run preview    # serve the build to test offline mode
```

Set the report API once Person 4 has it (full POST URL) in `.env`:

```
VITE_REPORTS_ENDPOINT=https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/reports
```

Without it the app still works; reports are saved on the device and the header shows "Report API not connected".

## What's here

| Area | File |
| --- | --- |
| Map, roads, camps, route | `src/components/MapView.jsx` |
| Flood slider, route summary, legend | `src/components/ControlPanel.jsx` |
| Report form + pending queue | `src/components/ReportForm.jsx` |
| Online/offline + sync status | `src/components/StatusBar.jsx` |
| Data loading/validation | `src/lib/data.js` |
| Routing adapter | `src/lib/routing.js` |
| IndexedDB queue / API client | `src/lib/db.js`, `src/lib/api.js`, `src/hooks/useReports.js` |
| PWA / caching | `vite.config.js` |

## Integration points

**Person 1 (data):** drop `roads.json`, `camps.json`, `scenarios.json` into `public/data/`.
Expected: `{nodes, edges}`, `{camps: [{id, name, nodeId, lat, lng}]}`,
`{scenarios: [{id, name, blockedRoads: [edgeIds]}]}` (a plain array also works). Slider position 0 is always
"No flooding"; scenarios follow in order. Unknown road IDs or nodes show up under "Data warnings" in the
side panel. Camps without a valid `nodeId` are snapped to the nearest node.

**Person 2 (routing):** `src/lib/dijkstra.js` is a **stand-in**. Replace it with `dijkstra.js`. The adapter in
`src/lib/routing.js` calls `shortestPath(graph, blockedRoads, startId, endId)` and expects
`{path, distance, reachable}`. If the real signature differs, only `routing.js` needs editing.

**Person 4 (AWS):** the app POSTs JSON `{reportId, roadId, type, description}` to `VITE_REPORTS_ENDPOINT`.
`type` is one of `flooded`, `blocked`, `damaged`; `description` is at most 200 characters. A 2xx response counts as
stored. A 4xx marks the report as rejected (not retried). Network errors and 5xx are retried. The API needs
CORS enabled for the frontend origin.

## Offline behaviour

- App shell and the three JSON files are precached by the service worker, so the app loads and routes offline after one visit.
- Reports submitted offline are stored in IndexedDB (`flood-relief` / `pendingReports`) and sent when the
  browser comes back online, or via "Sync now".
- Map tiles are cached only for areas already viewed (OpenStreetMap tiles, 7 days). Offline, unseen tiles are blank but roads and routes still draw.
- Not implemented (lowest priority): automatic background sync when the app is closed, SRTM elevation.

## Sample data

`public/data/*.json` is generated sample data (3x4 grid, 3 camps, 3 scenarios) so the UI can be built
before Person 1 delivers. At "Severe flooding" from junction A no camp is reachable, which demonstrates the
no-route state.
