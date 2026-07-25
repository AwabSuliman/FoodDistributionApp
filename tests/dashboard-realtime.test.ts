import assert from "node:assert/strict";
import test from "node:test";
import { dashboardRealtimeTables } from "../src/lib/dashboard-realtime.ts";

test("live dashboards listen to every operational data source", () => {
  assert.deepEqual(dashboardRealtimeTables, [
    "delivery_events",
    "distribution_requests",
    "driver_applications",
    "notifications",
    "seasons",
  ]);
});
