import { findShortestPath } from "./dijkstra.js";

/**
 * Pick the relief camp with the shortest unblocked route from a starting place.
 *
 * A camp's graph location is `nodeId` when that field is set. Otherwise `id`
 * is the graph node, which keeps the earlier camp format working.
 * The returned `camp` is the same object that was passed in.
 *
 * @param {Parameters<typeof findShortestPath>[0]} graph
 * @param {string | number} startId
 * @param {Array<{ id: string | number, name?: string, nodeId?: string | number }>} camps
 * @param {Array<string | number>} blockedRoadIds
 * @returns {{ camp: { id: string | number, name?: string } | null, path: Array<string | number>, distance: number | null, reachable: boolean }}
 */
export function findNearestReachableCamp(graph, startId, camps, blockedRoadIds = []) {
  validateCamps(camps);
  assertCampIdsExist(graph, camps);

  let nearest = null;

  for (const camp of camps) {
    const route = findShortestPath(graph, startId, campNodeId(camp), blockedRoadIds);
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

function assertCampIdsExist(graph, camps) {
  if (camps.length === 0) return;
  if (graph === null || typeof graph !== "object" || Array.isArray(graph) || !Array.isArray(graph.nodes)) {
    return;
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return;
    if (node.id === undefined || node.id === null || node.id === "") return;
    nodeIds.add(node.id);
  }

  for (const camp of camps) {
    const nodeId = campNodeId(camp);
    if (!nodeIds.has(nodeId)) {
      if (hasNodeId(camp.nodeId)) {
        throw new Error(`Camp ${String(camp.id)} nodeId does not exist in the graph: ${String(camp.nodeId)}`);
      }
      throw new Error(`Camp ID does not exist in the graph: ${String(camp.id)}`);
    }
  }
}

function campNodeId(camp) {
  return hasNodeId(camp.nodeId) ? camp.nodeId : camp.id;
}

function hasNodeId(nodeId) {
  return nodeId !== undefined && nodeId !== null && nodeId !== "";
}
