import assert from "node:assert/strict";
import test from "node:test";
import { getBulkRequestOperation, isBulkSelectable } from "../src/lib/request-bulk.ts";
import type { DistributionRequest, RequestStatus } from "../src/lib/types.ts";

function request(status: RequestStatus): DistributionRequest {
  return {
    address: "10 Main Street",
    boxWeight: "21 lb",
    email: "recipient@example.org",
    householdSize: 3,
    id: `MWI-${status}`,
    instructions: "Call on arrival",
    phone: "555-0100",
    recipient: "Test Recipient",
    status,
    updated: "Just now",
  };
}

test("bulk actions match requests at the same operational stage", () => {
  assert.equal(getBulkRequestOperation([request("Submitted"), request("Submitted")]), "review");
  assert.equal(getBulkRequestOperation([request("Under review")]), "approve");
  assert.equal(getBulkRequestOperation([request("Approved"), request("Not delivered")]), "assign");
});

test("mixed or completed selections have no bulk action", () => {
  assert.equal(getBulkRequestOperation([request("Submitted"), request("Under review")]), null);
  assert.equal(getBulkRequestOperation([request("Delivered")]), null);
  assert.equal(getBulkRequestOperation([]), null);
});

test("only actionable request statuses can be selected", () => {
  assert.equal(isBulkSelectable("Submitted"), true);
  assert.equal(isBulkSelectable("Not delivered"), true);
  assert.equal(isBulkSelectable("Driver assigned"), false);
  assert.equal(isBulkSelectable("Delivered"), false);
});
