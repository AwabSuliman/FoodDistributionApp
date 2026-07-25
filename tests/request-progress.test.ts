import assert from "node:assert/strict";
import test from "node:test";
import { getRequestProgressIndex, requestProgressOrder } from "../src/lib/request-progress.ts";

test("standard request statuses follow the normal progress order", () => {
  requestProgressOrder.forEach((status, index) => {
    assert.equal(getRequestProgressIndex(status), index);
  });
});

test("denied requests stop after admin review", () => {
  assert.equal(getRequestProgressIndex("Denied"), requestProgressOrder.indexOf("Under review"));
});

test("failed deliveries show that the delivery attempt was reached", () => {
  assert.equal(getRequestProgressIndex("Not delivered"), requestProgressOrder.indexOf("Out for delivery"));
});
