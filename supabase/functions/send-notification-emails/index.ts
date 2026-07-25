import { withSupabase } from "npm:@supabase/server@^1";
import { renderNotificationEmail } from "./email-template.ts";

type OutboxRow = {
  id: number;
  notification_id: number;
  recipient_email: string;
  subject: string;
  text_body: string;
};

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  return "Unknown email provider error";
}

const emailWorker = {
  fetch: withSupabase({ auth: "secret" }, async (_request, context) => {
    let resendApiKey: string;
    let emailFrom: string;
    let appUrl: string;

    try {
      resendApiKey = requiredSecret("RESEND_API_KEY");
      emailFrom = requiredSecret("EMAIL_FROM");
      appUrl = requiredSecret("APP_URL");
    } catch (error) {
      return Response.json({ error: errorMessage(error) }, { status: 500 });
    }

    const { data, error } = await context.supabaseAdmin.rpc("claim_email_outbox", {
      batch_size: 20,
    });

    if (error) {
      return Response.json({ error: "Unable to claim queued emails." }, { status: 500 });
    }

    const rows = (data ?? []) as OutboxRow[];
    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const email = renderNotificationEmail({
          appUrl,
          message: row.text_body,
          subject: row.subject,
        });
        const response = await fetch("https://api.resend.com/emails", {
          body: JSON.stringify({
            from: emailFrom,
            html: email.html,
            subject: row.subject,
            text: email.text,
            to: [row.recipient_email],
          }),
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `zakat-notification-${row.notification_id}`,
          },
          method: "POST",
        });
        const result = await response.json();

        if (!response.ok || typeof result?.id !== "string") {
          throw new Error(`Resend returned ${response.status}: ${JSON.stringify(result)}`);
        }

        const completion = await context.supabaseAdmin.rpc("complete_email_outbox", {
          resend_message_id: result.id,
          target_outbox_id: row.id,
        });
        if (completion.error) throw new Error(completion.error.message);
        sent += 1;
      } catch (error) {
        failed += 1;
        await context.supabaseAdmin.rpc("fail_email_outbox", {
          failure_message: errorMessage(error),
          target_outbox_id: row.id,
        });
      }
    }

    return Response.json({ claimed: rows.length, failed, sent });
  }),
};

export default emailWorker;
