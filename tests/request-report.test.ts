import assert from "node:assert/strict";
import test from "node:test";
import { makeRequestReport } from "../src/lib/request-report.ts";
import type { DistributionRequest, RequestStatus } from "../src/lib/types.ts";

function request(status: RequestStatus, householdSize: number, boxWeight: string): DistributionRequest {
  return {
    address: "10 Main Street",
    boxWeight,
    email: "recipient@example.org",
    householdSize,
    id: `MWI-${status}`,
    instructions: "Call on arrival",
    phone: "555-0100",
    recipient: "Test Recipient",
    status,
    updated: "Just now",
  };
}

test("distribution reports total active families, people, and food weight", () => {
  const report = makeRequestReport([
    request("Submitted", 2, "14 lb"),
    request("Approved", 4, "28 lb"),
    request("Delivered", 3, "21 lb"),
    request("Denied", 5, "35 lb"),
  ]);

  assert.equal(report.families, 3);
  assert.equal(report.householdMembers, 9);
  assert.equal(report.approvedWeightLbs, 49);
  assert.equal(report.deliveredWeightLbs, 21);
});

test("distribution reports include a status-level breakdown", () => {
  const report = makeRequestReport([
    request("Approved", 4, "28 lb"),
    request("Approved", 2, "14 lb"),
  ]);

  assert.deepEqual(report.statusRows, [
    {
      families: 2,
      householdMembers: 6,
      status: "Approved",
      weightLbs: 42,
    },
  ]);
});
