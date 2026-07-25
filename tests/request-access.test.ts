import assert from "node:assert/strict";
import test from "node:test";
import {
  canEditRequest,
  canRecipientEditRequest,
  canSubmitRecipientRequest,
  requestAssignmentAction,
} from "../src/lib/request-access.ts";

test("signed-in recipients cannot submit twice in one active season", () => {
  assert.equal(canSubmitRecipientRequest("recipient", true), false);
  assert.equal(canSubmitRecipientRequest("recipient", false), true);
});

test("demo and admin views can still exercise the recipient form", () => {
  assert.equal(canSubmitRecipientRequest(undefined, true), true);
  assert.equal(canSubmitRecipientRequest("admin", true), true);
});

test("driver-only accounts cannot submit recipient requests", () => {
  assert.equal(canSubmitRecipientRequest("driver", false), false);
});

test("request details are editable only before approval", () => {
  assert.equal(canEditRequest("Submitted"), true);
  assert.equal(canEditRequest("Under review"), true);
  assert.equal(canEditRequest("Approved"), false);
  assert.equal(canEditRequest("Out for delivery"), false);
  assert.equal(canEditRequest("Delivered"), false);
});

test("only recipients see the self-service request editor", () => {
  assert.equal(canRecipientEditRequest("recipient", "Submitted"), true);
  assert.equal(canRecipientEditRequest("recipient", "Under review"), true);
  assert.equal(canRecipientEditRequest("recipient", "Approved"), false);
  assert.equal(canRecipientEditRequest("driver", "Submitted"), false);
  assert.equal(canRecipientEditRequest("admin", "Submitted"), false);
});

test("admins can assign available requests and release early assignments", () => {
  assert.equal(requestAssignmentAction("Approved"), "assign");
  assert.equal(requestAssignmentAction("Not delivered"), "assign");
  assert.equal(requestAssignmentAction("Driver assigned"), "unassign");
  assert.equal(requestAssignmentAction("Heading to pickup"), "unassign");
  assert.equal(requestAssignmentAction("Picked up"), null);
  assert.equal(requestAssignmentAction("Delivered"), null);
});
