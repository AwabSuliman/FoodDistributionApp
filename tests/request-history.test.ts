import assert from "node:assert/strict";
import test from "node:test";
import { groupRequestsBySeason } from "../src/lib/request-history.ts";
import type { DistributionRequest } from "../src/lib/types.ts";

function request(id: string, seasonId?: string, seasonName?: string): DistributionRequest {
  return {
    address: "10 Main Street",
    boxWeight: "21 lb",
    email: "recipient@example.org",
    householdSize: 3,
    id,
    instructions: "Call on arrival",
    phone: "(555) 010-1000",
    recipient: "Test Recipient",
    seasonId,
    seasonName,
    status: "Delivered",
    updated: "Last year",
  };
}

test("archived requests are grouped by their distribution season", () => {
  const groups = groupRequestsBySeason([
    request("MWI-3", "season-2026", "Ramadan 2026"),
    request("MWI-2", "season-2025", "Ramadan 2025"),
    request("MWI-1", "season-2025", "Ramadan 2025"),
  ]);

  assert.deepEqual(
    groups.map((group) => ({ id: group.id, name: group.name, requests: group.requests.map((item) => item.id) })),
    [
      { id: "season-2026", name: "Ramadan 2026", requests: ["MWI-3"] },
      { id: "season-2025", name: "Ramadan 2025", requests: ["MWI-2", "MWI-1"] },
    ],
  );
});

test("legacy history without season metadata remains visible", () => {
  const groups = groupRequestsBySeason([request("MWI-1")]);

  assert.equal(groups[0].name, "Past season");
  assert.equal(groups[0].requests[0].id, "MWI-1");
});
