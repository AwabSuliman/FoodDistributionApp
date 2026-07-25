import assert from "node:assert/strict";
import test from "node:test";
import { renderNotificationEmail } from "../supabase/functions/send-notification-emails/email-template.ts";

test("notification email includes a plain-text and branded HTML version", () => {
  const email = renderNotificationEmail({
    appUrl: "https://food.example.com/",
    message: "MWI-1042 was approved.",
    subject: "Zakatul Fitr: Request approved",
  });

  assert.match(email.text, /MWI-1042 was approved/);
  assert.match(email.text, /https:\/\/food\.example\.com/);
  assert.match(email.html, /MASJID AL-WASATIYAH WAL-ITIDAAL/);
  assert.match(email.html, /href="https:\/\/food\.example\.com"/);
});

test("notification email escapes provider-facing HTML content", () => {
  const email = renderNotificationEmail({
    appUrl: "https://food.example.com",
    message: "<script>alert('no')</script>",
    subject: "Status <updated>",
  });

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.html, /Status &lt;updated&gt;/);
});
