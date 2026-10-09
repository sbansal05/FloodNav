import assert from "node:assert/strict";
import test from "node:test";
import { findNearestReachableCamp } from "../src/algorithms/reliefCamps.js";

function areaGraph() {
  return {
    nodes: [
      { id: "start", lat: 0, lng: 0 },
      { id: "near", lat: 0, lng: 1 },
      { id: "far", lat: 0, lng: 2 },
      { id: "equal-a", lat: 1, lng: 0 },
      { id: "equal-b", lat: -1, lng: 0 },
      { id: "cut-off", lat: 2, lng: 2 },
      { id: "island", lat: 3, lng: 3 },
    ],
    edges: [
      { id: "to-near", from: "start", to: "near", distance: 2 },
      { id: "to-far", from: "start", to: "far", distance: 5 },
      { id: "to-equal-a", from: "start", to: "equal-a", distance: 4 },
      { id: "to-equal-b", from: "start", to: "equal-b", distance: 4 },
    ],
  };
}

const nearCamp = { id: "near", name: "North Shelter" };
const farCamp = { id: "far", name: "South Shelter" };
const cutOffCamp = { id: "cut-off", name: "Riverside" };
const islandCamp = { id: "island", name: "Island" };

test("selects the camp with the shortest road distance", () => {
  const result = findNearestReachableCamp(areaGraph(), "start", [
    farCamp,
    nearCamp,
    cutOffCamp,
  ]);

  assert.deepEqual(result, {
    camp: nearCamp,
    path: ["start", "near"],
    distance: 2,
    reachable: true,
  });
});

test("skips an unreachable camp", () => {
  const result = findNearestReachableCamp(areaGraph(), "start", [cutOffCamp, farCamp]);

  assert.deepEqual(result, {
    camp: farCamp,
    path: ["start", "far"],
    distance: 5,
    reachable: true,
  });
});

test("returns unreachable when every camp is unreachable", () => {
  const result = findNearestReachableCamp(areaGraph(), "start", [cutOffCamp, islandCamp]);

  assert.deepEqual(result, {
    camp: null,
    path: [],
    distance: null,
    reachable: false,
  });
});

test("selects a different camp when the shorter road is flooded", () => {
  const open = findNearestReachableCamp(areaGraph(), "start", [nearCamp, farCamp]);
  const flooded = findNearestReachableCamp(areaGraph(), "start", [nearCamp, farCamp], ["to-near"]);

  assert.equal(open.camp.id, "near");
  assert.deepEqual(flooded, {
    camp: farCamp,
    path: ["start", "far"],
    distance: 5,
    reachable: true,
  });
});

test("keeps the earlier camp when distances are equal", () => {
  const first = { id: "equal-b", name: "West Shelter" };
  const second = { id: "equal-a", name: "East Shelter" };

  const result = findNearestReachableCamp(areaGraph(), "start", [first, second]);

  assert.deepEqual(result, {
    camp: first,
    path: ["start", "equal-b"],
    distance: 4,
    reachable: true,
  });
});

test("rejects invalid or duplicate camp IDs", () => {
  const graph = areaGraph();

  assert.throws(() => findNearestReachableCamp(graph, "start", null), /Camps must be an array/);
  assert.throws(
    () => findNearestReachableCamp(graph, "start", [nearCamp, null]),
    /Every camp must be an object with an id/,
  );
  assert.throws(
    () => findNearestReachableCamp(graph, "start", [{ name: "Missing id" }]),
    /Every camp must have an id/,
  );
  assert.throws(
    () => findNearestReachableCamp(graph, "start", [{ id: "" }]),
    /Every camp must have an id/,
  );
  assert.throws(
    () => findNearestReachableCamp(graph, "start", [nearCamp, { id: "near", name: "Copy" }]),
    /Duplicate camp ID: near/,
  );
  assert.throws(
    () => findNearestReachableCamp(graph, "start", [{ id: "near", name: 12 }]),
    /Camp near has an invalid name/,
  );
});

test("rejects a camp ID that is not a graph node", () => {
  assert.throws(
    () => findNearestReachableCamp(areaGraph(), "start", [nearCamp, { id: "missing-camp", name: "Ghost" }]),
    /Camp ID does not exist in the graph: missing-camp/,
  );
});

test("does not mutate the graph, camps, or blocked-road list", () => {
  const graph = areaGraph();
  const camps = [farCamp, nearCamp, cutOffCamp];
  const blockedRoadIds = ["to-near"];
  const graphBefore = structuredClone(graph);
  const campsBefore = structuredClone(camps);
  const blockedBefore = structuredClone(blockedRoadIds);

  findNearestReachableCamp(graph, "start", camps, blockedRoadIds);

  assert.deepEqual(graph, graphBefore);
  assert.deepEqual(camps, campsBefore);
  assert.deepEqual(blockedRoadIds, blockedBefore);
});
