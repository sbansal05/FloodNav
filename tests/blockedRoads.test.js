import assert from "node:assert/strict";
import test from "node:test";
import { getBlockedRoads } from "../src/algorithms/blockedRoads.js";
import { findShortestPath } from "../src/algorithms/dijkstra.js";

function roadGraph() {
  return {
    nodes: [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 0, lng: 1 },
      { id: "C", lat: 1, lng: 0.5 },
    ],
    edges: [
      { id: "direct", from: "A", to: "B", distance: 10 },
      { id: "to-c", from: "A", to: "C", distance: 3 },
      { id: "from-c", from: "C", to: "B", distance: 3 },
    ],
  };
}

function validRoadIds(graph) {
  return new Set(graph.edges.map((edge) => edge.id));
}

test("a citizen-blocked road changes the shortest route when an alternative exists", () => {
  const graph = roadGraph();
  const { blocked, citizenBlocked } = getBlockedRoads(
    [],
    { "from-c": { latestType: "flooded" } },
    validRoadIds(graph),
  );

  assert.deepEqual([...citizenBlocked], ["from-c"]);
  assert.deepEqual(
    findShortestPath(graph, "A", "B", [...blocked]),
    { path: ["A", "B"], distance: 10, reachable: true },
  );
});

test("a citizen safe report does not unblock a scenario-blocked road", () => {
  const graph = roadGraph();
  const scenarioBlocked = ["from-c"];
  const { blocked, citizenBlocked } = getBlockedRoads(
    scenarioBlocked,
    { "from-c": { latestType: "safe" }, direct: { latestType: "safe" } },
    validRoadIds(graph),
  );

  assert.deepEqual([...citizenBlocked], []);
  assert.deepEqual([...blocked], ["from-c"]);
  assert.deepEqual(
    findShortestPath(graph, "A", "B", [...blocked]),
    { path: ["A", "B"], distance: 10, reachable: true },
  );
});

test("ignores an unknown citizen road ID", () => {
  const graph = roadGraph();
  const { blocked, citizenBlocked, ignored } = getBlockedRoads(
    [],
    { "missing-road": { latestType: "blocked" } },
    validRoadIds(graph),
  );

  assert.deepEqual([...blocked], []);
  assert.deepEqual([...citizenBlocked], []);
  assert.deepEqual(ignored, ["missing-road"]);
});

test("reports unreachable when every route is blocked", () => {
  const graph = roadGraph();
  const { blocked } = getBlockedRoads(
    ["direct", "to-c"],
    { "from-c": { latestType: "blocked" } },
    validRoadIds(graph),
  );

  assert.deepEqual(findShortestPath(graph, "A", "B", [...blocked]), {
    path: [],
    distance: null,
    reachable: false,
  });
});

test("handles null citizen reports and missing or unexpected latestType values", () => {
  const graph = roadGraph();
  const valid = validRoadIds(graph);
  const scenarioBlocked = ["direct"];

  for (const citizenRoads of [null, undefined]) {
    const result = getBlockedRoads(scenarioBlocked, citizenRoads, valid);
    assert.deepEqual([...result.blocked], ["direct"]);
    assert.deepEqual([...result.citizenBlocked], []);
    assert.deepEqual(result.ignored, []);
  }

  const result = getBlockedRoads(
    scenarioBlocked,
    {
      "to-c": {},
      "from-c": { latestType: "damaged" },
      direct: { latestType: null },
    },
    valid,
  );

  assert.deepEqual([...result.blocked], ["direct"]);
  assert.deepEqual([...result.citizenBlocked], []);
  assert.deepEqual(result.ignored, []);
});

test("does not mutate the scenario list, citizen reports, or valid road IDs", () => {
  const scenarioBlocked = ["direct"];
  const citizenRoads = {
    "from-c": { latestType: "blocked" },
    "missing-road": { latestType: "flooded" },
  };
  const valid = new Set(["direct", "to-c", "from-c"]);
  const scenarioBefore = structuredClone(scenarioBlocked);
  const reportsBefore = structuredClone(citizenRoads);
  const validBefore = new Set(valid);

  getBlockedRoads(scenarioBlocked, citizenRoads, valid);

  assert.deepEqual(scenarioBlocked, scenarioBefore);
  assert.deepEqual(citizenRoads, reportsBefore);
  assert.deepEqual(valid, validBefore);
});
