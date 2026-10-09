import assert from "node:assert/strict";
import test from "node:test";
import { findShortestPath } from "../src/algorithms/dijkstra.js";

function roadGraph() {
  return {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 0, lng: 1 },
      { id: "C", lat: 1, lng: 0.5 },
      { id: "D", lat: 2, lng: 2 },
    ],
    edges: [
      { id: "direct", from: "A", to: "B", distance: 10 },
      { id: "to-c", from: "A", to: "C", distance: 3 },
      { id: "from-c", from: "C", to: "B", distance: 3 },
    ],
  };
}

test("prefers a shorter multi-road route over a longer direct road", () => {
  const result = findShortestPath(roadGraph(), "A", "B");

  assert.deepEqual(result, {
    path: ["A", "C", "B"],
    distance: 6,
    reachable: true,
  });
});

test("avoids a blocked road that would have been on the shortest path", () => {
  const result = findShortestPath(roadGraph(), "A", "B", ["from-c"]);

  assert.deepEqual(result, {
    path: ["A", "B"],
    distance: 10,
    reachable: true,
  });
});

test("reports an unreachable destination", () => {
  const result = findShortestPath(roadGraph(), "A", "D");

  assert.deepEqual(result, {
    path: [],
    distance: null,
    reachable: false,
  });
});

test("returns the same node with distance 0 when start and end match", () => {
  const result = findShortestPath(roadGraph(), "A", "A");

  assert.deepEqual(result, {
    path: ["A"],
    distance: 0,
    reachable: true,
  });
});

test("rejects an unknown node ID", () => {
  assert.throws(
    () => findShortestPath(roadGraph(), "missing", "B"),
    /Unknown start node: missing/,
  );
  assert.throws(
    () => findShortestPath(roadGraph(), "A", "missing"),
    /Unknown end node: missing/,
  );
});

test("rejects negative and non-finite distances", () => {
  for (const distance of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const graph = roadGraph();
    graph.edges[0].distance = distance;
    assert.throws(
      () => findShortestPath(graph, "A", "B"),
      /Road direct has an invalid distance/,
    );
  }
});

test("allows a zero-distance road", () => {
  const graph = roadGraph();
  graph.edges[1].distance = 0;
  graph.edges[2].distance = 0;

  const result = findShortestPath(graph, "A", "B");

  assert.deepEqual(result, {
    path: ["A", "C", "B"],
    distance: 0,
    reachable: true,
  });
});

test("rejects duplicate node IDs, duplicate road IDs, and invalid endpoints", () => {
  const duplicateNode = roadGraph();
  duplicateNode.nodes.push({ id: "A", lat: 3, lng: 3 });
  assert.throws(() => findShortestPath(duplicateNode, "A", "B"), /Duplicate node ID: A/);

  const duplicateRoad = roadGraph();
  duplicateRoad.edges.push({ id: "direct", from: "A", to: "C", distance: 1 });
  assert.throws(() => findShortestPath(duplicateRoad, "A", "B"), /Duplicate road ID: direct/);

  const badEndpoint = roadGraph();
  badEndpoint.edges.push({ id: "nowhere", from: "A", to: "Z", distance: 1 });
  assert.throws(
    () => findShortestPath(badEndpoint, "A", "B"),
    /Road nowhere has an invalid endpoint/,
  );
});

test("rejects a malformed graph", () => {
  assert.throws(() => findShortestPath(null, "A", "B"), /Graph must be an object/);
  assert.throws(
    () => findShortestPath({ nodes: [], edges: null }, "A", "B"),
    /nodes and edges arrays/,
  );
});
