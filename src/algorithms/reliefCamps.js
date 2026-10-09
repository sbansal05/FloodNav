import { findShortestPath } from "./dijkstra.js";

/**
 * Pick the relief camp with the shortest unblocked route from a starting place.
 *
 * Each camp needs an `id` that matches a graph node. `name` is optional.
 *
 * @param {Parameters<typeof findShortestPath>[0]} graph
 * @param {string | number} startId
 * @param {Array<{ id: string | number, name?: string }>} camps
 * @param {Array<string | number>} blockedRoadIds
 * @returns {{ camp: { id: string | number, name?: string } | null, path: Array<string | number>, distance: number | null, reachable: boolean }}
 */
export function findNearestReachableCamp(graph, startId, camps, blockedRoadIds = []) {
  validateCamps(camps);

  let nearest = null;

  for (const camp of camps) {
    const route = findShortestPath(graph, startId, camp.id, blockedRoadIds);
    if (!route.reachable) continue;

    // Strict < keeps the earlier camp when two distances are equal.
    if (nearest === null || route.distance < nearest.distance) {
      nearest = {
        camp,
        path: route.path,
        distance: route.distance,
        reachable: true,
      };
    }
  }

  if (nearest === null) {
    return { camp: null, path: [], distance: null, reachable: false };
  }

  return nearest;
}

function validateCamps(camps) {
  if (!Array.isArray(camps)) {
    throw new Error("Camps must be an array");
  }

  const seen = new Set();
  for (const camp of camps) {
    if (camp === null || typeof camp !== "object" || Array.isArray(camp)) {
      throw new Error("Every camp must be an object with an id");
    }
    if (camp.id === undefined || camp.id === null || camp.id === "") {
      throw new Error("Every camp must have an id");
    }
    if (seen.has(camp.id)) {
      throw new Error(`Duplicate camp ID: ${String(camp.id)}`);
    }
    seen.add(camp.id);
    if (camp.name !== undefined && typeof camp.name !== "string") {
      throw new Error(`Camp ${String(camp.id)} has an invalid name`);
    }
  }
}
