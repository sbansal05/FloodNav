/**
 * Combine scenario flood blocks with citizen road reports.
 *
 * Citizen reports only add blocks. A "safe" report does not reopen a road
 * that the selected scenario already closed.
 *
 * @param {Iterable<string | number>} scenarioBlocked
 * @param {Record<string, { latestType?: string }> | null | undefined} citizenRoads
 * @param {Set<string | number>} validRoadIds
 * @returns {{ blocked: Set<string | number>, citizenBlocked: Set<string | number>, ignored: string[] }}
 */
export function getBlockedRoads(scenarioBlocked, citizenRoads = {}, validRoadIds) {
  const blocked = new Set(scenarioBlocked);
  const citizenBlocked = new Set();
  const ignored = [];
  const reports = citizenRoads ?? {};

  for (const roadId of Object.keys(reports)) {
    const latestType = reports[roadId]?.latestType;
    if (latestType !== "flooded" && latestType !== "blocked") continue;
    if (!validRoadIds.has(roadId)) {
      ignored.push(roadId);
      continue;
    }
    blocked.add(roadId);
    citizenBlocked.add(roadId);
  }

  return { blocked, citizenBlocked, ignored };
}
