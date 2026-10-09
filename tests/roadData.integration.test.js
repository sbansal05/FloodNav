import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findNearestReachableCamp } from "../src/algorithms/reliefCamps.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../frontend/public/data");
const START_KEY = "6722487558";

// Candidate expectations from Person 3. These stay in the test only.
const DISTANCE_TOLERANCE_METRES = 0.5;

const expectedRoutes = [
  { label: "No flooding", scenarioId: null, campId: "566643822", distance: 6197, segments: 38 },
  { label: "Level 1", scenarioId: "level_1", campId: "566643822", distance: 6630, segments: 45 },
  { label: "Level 2", scenarioId: "level_2", campId: "566643822", distance: 7676, segments: 95 },
  { label: "Level 3", scenarioId: "level_3", campId: "566643822", distance: 9705, segments: 102 },
];

const roads = await readJson("roads.json");
const campsFile = await readJson("camps.json");
const scenariosFile = await readJson("scenarios.json");
const camps = campsFile.camps;
const scenarios = scenariosFile.scenarios;
const startNode = (roads.nodes ?? []).find((node) => String(node.id) === START_KEY);

test("Guwahati routes from 6722487558 match the candidate expectations", () => {
  assert.ok(startNode, "roads.json has no node 6722487558");
  assert.ok(Array.isArray(camps), "camps.json must contain a camps array");
  assert.ok(Array.isArray(scenarios), "scenarios.json must contain a scenarios array");

  const lines = [];
  let failed = false;

  for (const expected of expectedRoutes) {
    const blockedRoadIds = blockedRoadsFor(expected.scenarioId);
    const result = findNearestReachableCamp(roads, startNode.id, camps, blockedRoadIds);
    const segments = result.reachable ? result.path.length - 1 : null;
    const campId = result.camp?.id ?? null;
    const distanceMatches =
      typeof result.distance === "number" &&
      Math.abs(result.distance - expected.distance) <= DISTANCE_TOLERANCE_METRES;
    const matches =
      result.reachable === true &&
      String(campId) === expected.campId &&
      distanceMatches &&
      segments === expected.segments;

    if (!matches) failed = true;
    lines.push(
      `${expected.label}: actual camp ${campId}, ${result.distance} m, ${segments} segments; expected ${formatExpected(expected)}`,
    );
  }

  assert.equal(failed, false, `Route results differ from the candidate expectations.\n${lines.join("\n")}`);
});

function blockedRoadsFor(scenarioId) {
  if (scenarioId === null) return [];
  const scenario = scenarios.find((item) => item.id === scenarioId);
  assert.ok(scenario, `Missing scenario ${scenarioId}`);
  assert.ok(Array.isArray(scenario.blockedRoadIds), `${scenarioId} has no blockedRoadIds array`);
  return scenario.blockedRoadIds;
}

function formatExpected(expected) {
  return `camp ${expected.campId}, ${expected.distance} m, ${expected.segments} segments`;
}

function readJson(name) {
  return readFile(join(dataDir, name), "utf8").then((text) => JSON.parse(text));
}
