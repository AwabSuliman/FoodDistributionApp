import assert from "node:assert/strict";
import test from "node:test";
import { PublicError, publicErrorMessage } from "../src/lib/errors.ts";

test("public errors preserve messages that are safe to show users", () => {
  assert.equal(
    publicErrorMessage(new PublicError("This request has already moved to another status.")),
    "This request has already moved to another status.",
  );
});

test("unexpected errors do not expose internal details", () => {
  assert.equal(
    publicErrorMessage(new Error("database.internal: connection details")),
    "Something went wrong. Please try again.",
  );
  assert.equal(publicErrorMessage("raw failure"), "Something went wrong. Please try again.");
});
