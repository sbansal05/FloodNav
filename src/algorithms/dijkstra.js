/**
 * Shortest path on a flood-road graph.
 *
 * Graph shape:
 * {
 *   nodes: [{ id, lat, lng }],
 *   edges: [{ id, from, to, distance, oneway? }]
 * }
 * A road is one-way only when `oneway === true`. Every other road can be
 * traveled from `from` to `to` and from `to` to `from`.
 */

/**
 * @param {{ nodes: Array<{ id: string | number, lat: number, lng: number }>, edges: Array<{ id: string | number, from: string | number, to: string | number, distance: number, oneway?: boolean }> }} graph
 * @param {string | number} startId
 * @param {string | number} endId
 * @param {Array<string | number>} blockedRoadIds
 * @returns {{ path: Array<string | number>, distance: number | null, reachable: boolean }}
 */
export function findShortestPath(graph, startId, endId, blockedRoadIds = []) {
  const nodeIds = validateGraph(graph);
  const blocked = validateBlockedRoads(blockedRoadIds);

  if (!nodeIds.has(startId)) {
    throw new Error(`Unknown start node: ${String(startId)}`);
  }
  if (!nodeIds.has(endId)) {
    throw new Error(`Unknown end node: ${String(endId)}`);
  }

  if (startId === endId) {
    return { path: [startId], distance: 0, reachable: true };
  }

  const neighbors = buildAdjacency(graph.edges, blocked);

  // Tentative best distance from the start. Unreached nodes stay at Infinity.
  const distance = new Map();
  const previous = new Map();
  for (const id of nodeIds) {
    distance.set(id, Infinity);
  }
  distance.set(startId, 0);

  const settled = new Set();

  while (settled.size < nodeIds.size) {
    // Always expand the unsettled node that is currently closest to the start.
    let current = null;
    let best = Infinity;
    for (const id of nodeIds) {
      if (settled.has(id)) continue;
      const candidate = distance.get(id);
      if (candidate < best) {
        best = candidate;
        current = id;
      }
    }

    // Remaining nodes cannot be reached from the start.
    if (current === null || best === Infinity) break;

    settled.add(current);
    if (current === endId) break;

    for (const road of neighbors.get(current) ?? []) {
      if (settled.has(road.to)) continue;
      // Relaxation: keep a neighbor's route only when this one is shorter.
      const viaCurrent = distance.get(current) + road.distance;
      if (viaCurrent < distance.get(road.to)) {
        distance.set(road.to, viaCurrent);
        previous.set(road.to, current);
      }
    }
  }

  if (distance.get(endId) === Infinity) {
    return { path: [], distance: null, reachable: false };
  }

  return {
    path: rebuildPath(previous, startId, endId),
    distance: distance.get(endId),
    reachable: true,
  };
}

function validateGraph(graph) {
  if (graph === null || typeof graph !== "object" || Array.isArray(graph)) {
    throw new Error("Graph must be an object with nodes and edges arrays");
  }
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("Graph must include nodes and edges arrays");
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (!isRecord(node) || !hasId(node.id)) {
      throw new Error("Every node must have an id");
    }
    if (typeof node.lat !== "number" || !Number.isFinite(node.lat)) {
      throw new Error(`Node ${String(node.id)} must have a finite lat`);
    }
    if (typeof node.lng !== "number" || !Number.isFinite(node.lng)) {
      throw new Error(`Node ${String(node.id)} must have a finite lng`);
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node ID: ${String(node.id)}`);
    }
    nodeIds.add(node.id);
  }

  const roadIds = new Set();
  for (const edge of graph.edges) {
    if (!isRecord(edge) || !hasId(edge.id)) {
      throw new Error("Every road must have an id");
    }
    if (roadIds.has(edge.id)) {
      throw new Error(`Duplicate road ID: ${String(edge.id)}`);
    }
    roadIds.add(edge.id);

    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(`Road ${String(edge.id)} has an invalid endpoint`);
    }
    if (typeof edge.distance !== "number" || !Number.isFinite(edge.distance) || edge.distance < 0) {
      throw new Error(`Road ${String(edge.id)} has an invalid distance`);
    }
  }

  return nodeIds;
}

function validateBlockedRoads(blockedRoadIds) {
  if (!Array.isArray(blockedRoadIds)) {
    throw new Error("blockedRoadIds must be an array of road IDs");
  }
  return new Set(blockedRoadIds);
}

function buildAdjacency(edges, blocked) {
  const neighbors = new Map();
  for (const edge of edges) {
    // A blocked road is removed completely, including its reverse direction.
    if (blocked.has(edge.id)) continue;
    addDirected(neighbors, edge.from, edge.to, edge.distance);
    if (edge.oneway !== true) {
      addDirected(neighbors, edge.to, edge.from, edge.distance);
    }
  }
  return neighbors;
}

function addDirected(neighbors, from, to, distance) {
  let list = neighbors.get(from);
  if (!list) {
    list = [];
    neighbors.set(from, list);
  }

  // Parallel roads in the same direction: keep the shorter one.
  const existing = list.find((road) => road.to === to);
  if (!existing) {
    list.push({ to, distance });
  } else if (distance < existing.distance) {
    existing.distance = distance;
  }
}

function rebuildPath(previous, startId, endId) {
  const path = [];
  let cursor = endId;
  while (cursor !== undefined) {
    path.push(cursor);
    if (cursor === startId) break;
    cursor = previous.get(cursor);
  }
  path.reverse();
  return path;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasId(id) {
  return id !== undefined && id !== null && id !== "";
}
