import assert from "node:assert/strict";
import test from "node:test";

import { profileFromClaims, safeRedirectPath } from "../src/lib/auth-core.ts";

test("safeRedirectPath accepts only local absolute paths", () => {
  assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(safeRedirectPath("/dashboard?tab=drivers"), "/dashboard?tab=drivers");
  assert.equal(safeRedirectPath("https://example.com"), "/dashboard");
  assert.equal(safeRedirectPath("//example.com"), "/dashboard");
  assert.equal(safeRedirectPath("/\\example.com"), "/dashboard");
  assert.equal(safeRedirectPath(null), "/dashboard");
});

test("trusted app metadata can grant admin access", () => {
  const profile = profileFromClaims({
    app_metadata: { role: "admin" },
    email: "admin@example.com",
    sub: "admin-id",
    user_metadata: { name: "Admin", role: "recipient" },
  });

  assert.equal(profile.role, "admin");
  assert.equal(profile.userId, "admin-id");
});

test("public signup metadata cannot grant admin access", () => {
  const profile = profileFromClaims({
    email: "user@example.com",
    sub: "user-id",
    user_metadata: { name: "User", role: "admin" },
  });

  assert.equal(profile.role, "recipient");
});

test("driver intent is retained without granting database approval", () => {
  const profile = profileFromClaims({
    email: "driver@example.com",
    sub: "driver-id",
    user_metadata: { name: "Driver", role: "driver" },
  });

  assert.equal(profile.role, "driver");
});
