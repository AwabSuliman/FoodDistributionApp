import assert from "node:assert/strict";
import test from "node:test";
import { driverApplicationIdentifier, matchesDriverApplication } from "../src/lib/driver-applications.ts";

test("driver applications use the Supabase user ID when available", () => {
  const driver = {
    email: "driver@example.com",
    name: "Omar Hassan",
    phone: "555-0101",
    userId: "driver-user-id",
  };

  assert.equal(driverApplicationIdentifier(driver), "driver-user-id");
  assert.equal(matchesDriverApplication(driver, "driver-user-id"), true);
  assert.equal(matchesDriverApplication(driver, "driver@example.com"), false);
});

test("demo driver applications fall back to case-insensitive email matching", () => {
  const driver = { email: "Driver@Example.com", name: "Omar Hassan", phone: "555-0101" };

  assert.equal(driverApplicationIdentifier(driver), "Driver@Example.com");
  assert.equal(matchesDriverApplication(driver, "driver@example.com"), true);
});
