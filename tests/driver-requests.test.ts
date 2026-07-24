import assert from "node:assert/strict";
import test from "node:test";
import { getDriverRequestBuckets } from "../src/lib/driver-requests.ts";
import type { DistributionRequest, RequestStatus } from "../src/lib/types.ts";

function request(id: string, status: RequestStatus, driver?: string): DistributionRequest {
  return {
    address: "10 Main Street",
    boxWeight: "21 lb",
    driver,
    email: "recipient@example.org",
    householdSize: 3,
    id,
    instructions: "Call on arrival",
    phone: "(555) 010-1000",
    recipient: "Test Recipient",
    status,
    updated: "Just now",
  };
}

test("available deliveries include approved and failed attempts", () => {
  const buckets = getDriverRequestBuckets([
    request("MWI-1", "Approved"),
    request("MWI-2", "Not delivered", "Omar Hassan"),
    request("MWI-3", "Driver assigned", "Omar Hassan"),
  ]);

  assert.deepEqual(
    buckets.available.map((item) => item.id),
    ["MWI-1", "MWI-2"],
  );
});

test("claimed deliveries include only active work assigned to that driver", () => {
  const buckets = getDriverRequestBuckets(
    [
      request("MWI-1", "Driver assigned", "Omar Hassan"),
      request("MWI-2", "Heading to pickup", "Omar Hassan"),
      request("MWI-3", "Out for delivery", "Layla Ahmed"),
      request("MWI-4", "Not delivered", "Omar Hassan"),
      request("MWI-5", "Delivered", "Omar Hassan"),
    ],
    "Omar Hassan",
  );

  assert.deepEqual(
    buckets.assigned.map((item) => item.id),
    ["MWI-1", "MWI-2"],
  );
});

test("no driver identity produces no claimed-delivery bucket", () => {
  const buckets = getDriverRequestBuckets([request("MWI-1", "Driver assigned", "Omar Hassan")]);
  assert.deepEqual(buckets.assigned, []);
});
