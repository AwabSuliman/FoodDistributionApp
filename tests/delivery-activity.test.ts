import assert from "node:assert/strict";
import test from "node:test";
import { makeDeliveryActivity } from "../src/lib/delivery-activity.ts";

test("delivery claims identify the driver when available", () => {
  assert.deepEqual(
    makeDeliveryActivity({
      actorName: "Omar Hassan",
      eventType: "claimed",
      id: "1",
      occurred: "2 min ago",
    }),
    {
      detail: "Omar Hassan accepted this delivery.",
      id: "1",
      occurred: "2 min ago",
      title: "Delivery claimed",
    },
  );
});

test("admin assignments name the selected approved driver", () => {
  const activity = makeDeliveryActivity({
    assignedDriverName: "Layla Ahmed",
    eventType: "assigned",
    id: "2",
    occurred: "Just now",
  });

  assert.equal(activity.title, "Driver assigned");
  assert.equal(activity.detail, "Layla Ahmed was assigned by an administrator.");
});

test("status events explain the exact transition", () => {
  const activity = makeDeliveryActivity({
    eventType: "status_changed",
    fromStatus: "Picked up",
    id: "3",
    occurred: "1 hr ago",
    toStatus: "Out for delivery",
  });

  assert.equal(activity.title, "Status: Out for delivery");
  assert.equal(activity.detail, "Picked up changed to Out for delivery.");
});

test("unclaimed events explain that the delivery is available again", () => {
  const activity = makeDeliveryActivity({
    eventType: "unclaimed",
    id: "4",
    occurred: "3 min ago",
  });

  assert.equal(activity.title, "Delivery unclaimed");
  assert.equal(activity.detail, "The delivery was returned to the available queue.");
});
