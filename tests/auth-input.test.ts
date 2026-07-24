import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage, parseSignInInput, parseSignUpInput } from "../src/lib/auth-input.ts";

function makeFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

test("sign-in input normalizes valid email addresses", () => {
  const result = parseSignInInput(makeFormData({ email: "  STAFF@EXAMPLE.ORG ", password: "secret" }));

  assert.deepEqual(result, { data: { email: "staff@example.org", password: "secret" }, ok: true });
});

test("sign-up input validates name, password, and role", () => {
  const valid = parseSignUpInput(
    makeFormData({ email: "driver@example.org", name: "Amina Yusuf", password: "password123", role: "driver" }),
  );
  const shortPassword = parseSignUpInput(
    makeFormData({ email: "driver@example.org", name: "Amina Yusuf", password: "short", role: "driver" }),
  );
  const forgedRole = parseSignUpInput(
    makeFormData({ email: "driver@example.org", name: "Amina Yusuf", password: "password123", role: "admin" }),
  );

  assert.equal(valid.ok && valid.data.role, "driver");
  assert.equal(!shortPassword.ok && shortPassword.error, "Use at least 8 characters for your password.");
  assert.equal(!forgedRole.ok && forgedRole.error, "Choose recipient or driver.");
});

test("auth service errors are converted to user-friendly messages", () => {
  assert.equal(authErrorMessage("Invalid login credentials", "signin"), "Incorrect email or password.");
  assert.equal(authErrorMessage("Email not confirmed", "signin"), "Confirm your email before signing in.");
  assert.equal(
    authErrorMessage("User already registered", "signup"),
    "An account already exists for this email.",
  );
  assert.equal(
    authErrorMessage("Unexpected provider detail", "signup"),
    "Unable to create your account right now. Please try again.",
  );
});
