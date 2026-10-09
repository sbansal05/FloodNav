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

test("travels a one-way road only from from to to", () => {
  const graph = {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 1, lng: 0 },
    ],
    edges: [{ id: "ab", from: "A", to: "B", distance: 4, oneway: true }],
  };

  assert.deepEqual(findShortestPath(graph, "A", "B"), {
    path: ["A", "B"],
    distance: 4,
    reachable: true,
  });
  assert.deepEqual(findShortestPath(graph, "B", "A"), {
    path: [],
    distance: null,
    reachable: false,
  });
});

test("does not use a blocked road in either direction", () => {
  const graph = {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 0, lng: 1 },
      { id: "C", lat: 1, lng: 0 },
    ],
    edges: [
      { id: "ab", from: "A", to: "B", distance: 1 },
      { id: "ac", from: "A", to: "C", distance: 5 },
      { id: "cb", from: "C", to: "B", distance: 5 },
    ],
  };

  assert.deepEqual(findShortestPath(graph, "A", "B", ["ab"]), {
    path: ["A", "C", "B"],
    distance: 10,
    reachable: true,
  });
  assert.deepEqual(findShortestPath(graph, "B", "A", ["ab"]), {
    path: ["B", "C", "A"],
    distance: 10,
    reachable: true,
  });
});

test("keeps the cheapest edge when two roads share a direction", () => {
  const oneWay = {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 1, lng: 0 },
    ],
    edges: [
      { id: "slow", from: "A", to: "B", distance: 10, oneway: true },
      { id: "fast", from: "A", to: "B", distance: 3, oneway: true },
    ],
  };
  assert.deepEqual(findShortestPath(oneWay, "A", "B"), {
    path: ["A", "B"],
    distance: 3,
    reachable: true,
  });

  const bothWays = {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 1, lng: 0 },
    ],
    edges: [
      { id: "long", from: "A", to: "B", distance: 10 },
      { id: "short", from: "A", to: "B", distance: 2 },
    ],
  };
  assert.equal(findShortestPath(bothWays, "A", "B").distance, 2);
  assert.equal(findShortestPath(bothWays, "B", "A").distance, 2);
});

test("routes two-way travel represented by two directed edges", () => {
  const graph = {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 1, lng: 0 },
    ],
    edges: [
      { id: "ab", from: "A", to: "B", distance: 5, oneway: true },
      { id: "ba", from: "B", to: "A", distance: 9, oneway: true },
    ],
  };

  assert.deepEqual(findShortestPath(graph, "A", "B"), {
    path: ["A", "B"],
    distance: 5,
    reachable: true,
  });
  assert.deepEqual(findShortestPath(graph, "B", "A"), {
    path: ["B", "A"],
    distance: 9,
    reachable: true,
  });
});

test("rejects a malformed graph", () => {
  assert.throws(() => findShortestPath(null, "A", "B"), /Graph must be an object/);
  assert.throws(
    () => findShortestPath({ nodes: [], edges: null }, "A", "B"),
    /nodes and edges arrays/,
  );
});
