import assert from "node:assert/strict";
import test from "node:test";
import { makeDeliveryActivity } from "../src/lib/delivery-activity.ts";

test("request submission has a clear activity entry", () => {
  const activity = makeDeliveryActivity({
    eventType: "request_submitted",
    id: "submission",
    occurred: "Just now",
  });

  assert.equal(activity.title, "Request submitted");
  assert.equal(activity.detail, "The recipient sent this request to the mosque.");
});

test("request review decisions have specific activity entries", () => {
  const review = makeDeliveryActivity({
    eventType: "request_status_changed",
    fromStatus: "Submitted",
    id: "review",
    occurred: "5 min ago",
    toStatus: "Under review",
  });
  const approval = makeDeliveryActivity({
    eventType: "request_status_changed",
    fromStatus: "Under review",
    id: "approval",
    occurred: "2 min ago",
    toStatus: "Approved",
  });

  assert.equal(review.title, "Review started");
  assert.equal(approval.title, "Request approved");
});

test("request edits identify the type of editor", () => {
  const recipientEdit = makeDeliveryActivity({
    eventType: "request_edited",
    id: "edit",
    note: "recipient",
    occurred: "Just now",
  });

  assert.equal(recipientEdit.title, "Request details updated");
  assert.equal(recipientEdit.detail, "The recipient updated the household or delivery details.");
});

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

test("failed delivery events include the driver's reason", () => {
  const activity = makeDeliveryActivity({
    eventType: "status_changed",
    fromStatus: "Out for delivery",
    id: "4",
    note: "No one answered the door or phone.",
    occurred: "Just now",
    toStatus: "Not delivered",
  });

  assert.equal(activity.title, "Status: Not delivered");
  assert.equal(
    activity.detail,
    "Out for delivery changed to Not delivered. Reason: No one answered the door or phone.",
  );
});

test("unclaimed events explain that the delivery is available again", () => {
  const activity = makeDeliveryActivity({
    eventType: "unclaimed",
    id: "5",
    occurred: "3 min ago",
  });

  assert.equal(activity.title, "Delivery unclaimed");
  assert.equal(activity.detail, "The delivery was returned to the available queue.");
});
