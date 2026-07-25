import assert from "node:assert/strict";
import test from "node:test";
import { inputLimits, validateRequiredText } from "../src/lib/input-limits.ts";

test("required text is trimmed and accepted within its limit", () => {
  assert.deepEqual(validateRequiredText("  Safiya Noor  ", "Full name", inputLimits.name), {
    data: "Safiya Noor",
    ok: true,
  });
});

test("required text rejects blank and oversized values with specific messages", () => {
  assert.deepEqual(validateRequiredText("   ", "Address", inputLimits.address), {
    error: "Address is required.",
    ok: false,
  });
  assert.deepEqual(validateRequiredText("a".repeat(inputLimits.address + 1), "Address", inputLimits.address), {
    error: "Address must be 300 characters or fewer.",
    ok: false,
  });
});
