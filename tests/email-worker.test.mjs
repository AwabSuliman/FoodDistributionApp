import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL(
  "../supabase/functions/send-notification-emails/index.ts",
  import.meta.url,
);
const worker = await readFile(workerUrl, "utf8");

test("email worker requires secrets and sends through Resend idempotently", () => {
  for (const secret of ["RESEND_API_KEY", "EMAIL_FROM", "APP_URL"]) {
    assert.match(worker, new RegExp(`requiredSecret\\("${secret}"\\)`));
  }

  assert.match(worker, /withSupabase\(\{ auth: "secret" \}/);
  assert.match(worker, /https:\/\/api\.resend\.com\/emails/);
  assert.match(worker, /"Idempotency-Key": `zakat-notification-\$\{row\.notification_id\}`/);
  assert.match(worker, /complete_email_outbox/);
  assert.match(worker, /fail_email_outbox/);
});
