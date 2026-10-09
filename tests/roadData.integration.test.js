import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findNearestReachableCamp } from "../src/algorithms/reliefCamps.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../frontend/public/data");
const START_KEY = "6722487558";
const DEMO_NODE_IDS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);

// Expected results stay in this test. They are not written into the routing code.
const expectedRoutes = [
  { label: "No flooding", campId: "C1", distance: 6197, segments: 38 },
  { label: "L1", campId: "C1", distance: 6630, segments: 45 },
  { label: "L2", campId: "C1", distance: 7221, segments: 52 },
  { label: "L3", campId: "C1", distance: 7676, segments: 95 },
];

const roads = await readJson("roads.json");
const campsFile = await readJson("camps.json");
const scenariosFile = await readJson("scenarios.json");
const camps = Array.isArray(campsFile) ? campsFile : (campsFile.camps ?? []);
const scenarios = Array.isArray(scenariosFile) ? scenariosFile : (scenariosFile.scenarios ?? []);

const nodes = roads.nodes ?? [];
const startNode = nodes.find((node) => sameId(node.id, START_KEY));
const isDemoGrid = nodes.length > 0 && nodes.every((node) => DEMO_NODE_IDS.has(String(node.id)));
const floodScenarios = expectedRoutes.filter((route) => route.label !== "No flooding");
const missingScenarioLabels = floodScenarios
  .filter((route) => !findScenario(route.label))
  .map((route) => route.label);

const skipReason = skipExplanation();

test(
  "real road data matches the expected camp routes from 6722487558",
  { skip: skipReason || false },
  () => {
    for (const expected of expectedRoutes) {
      const blockedRoadIds = blockedRoadsFor(expected.label);
      const result = findNearestReachableCamp(roads, startNode.id, camps, blockedRoadIds);
      const segments = result.path.length - 1;
      assert.equal(result.reachable, true, `${expected.label} should reach a camp`);
      assert.equal(String(result.camp?.id), expected.campId, `${expected.label} camp`);
      assert.equal(result.distance, expected.distance, `${expected.label} distance was ${result.distance}`);
      assert.equal(segments, expected.segments, `${expected.label} segments were ${segments}`);
    }
  },
);

function skipExplanation() {
  if (isDemoGrid) {
    return "roads.json is the documented A–L sample grid, not the graph containing node 6722487558. The OSM route check is skipped, and the expected distances were not changed.";
  }
  if (!startNode) {
    return "roads.json has no node 6722487558 when ids are compared as text, whether stored as strings or numbers. The OSM route check is skipped.";
  }
  if (missingScenarioLabels.length > 0) {
    const available = scenarios.map((scenario) => scenario.id ?? scenario.name).join(", ");
    return `Node 6722487558 is present, but ${missingScenarioLabels.join(", ")} are not scenario ids or names. Available scenarios: ${available}. No L1/L2/L3 mapping was inferred, and the expected distances were not changed.`;
  }
  return "";
}

function findScenario(label) {
  return scenarios.find((scenario) => sameId(scenario.id, label) || sameId(scenario.name, label));
}

function blockedRoadsFor(label) {
  if (label === "No flooding") return [];
  const scenario = findScenario(label);
  return scenario.blockedRoads ?? scenario.blockedRoadIds ?? scenario.blocked ?? [];
}

function sameId(left, right) {
  return String(left) === String(right);
}

function readJson(name) {
  return readFile(join(dataDir, name), "utf8").then((text) => JSON.parse(text));
}
