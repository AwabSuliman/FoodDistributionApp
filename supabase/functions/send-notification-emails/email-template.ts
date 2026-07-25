export type NotificationEmailInput = {
  appUrl: string;
  message: string;
  subject: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizedAppUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function renderNotificationEmail(input: NotificationEmailInput) {
  const appUrl = normalizedAppUrl(input.appUrl);
  const safeMessage = escapeHtml(input.message).replaceAll("\n", "<br>");
  const safeSubject = escapeHtml(input.subject);
  const safeUrl = escapeHtml(appUrl);

  return {
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f5f1;color:#17201f;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f1;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #d8ded7">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #e3e8e4">
                <div style="font-size:12px;font-weight:700;color:#53645f">MASJID AL-WASATIYAH WAL-ITIDAAL</div>
                <div style="margin-top:6px;font-size:22px;font-weight:700">Zakatul Fitr Distribution</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px">
                <h1 style="margin:0;font-size:20px;line-height:1.4">${safeSubject}</h1>
                <p style="margin:16px 0 24px;font-size:16px;line-height:1.6;color:#53645f">${safeMessage}</p>
                <a href="${safeUrl}" style="display:inline-block;background:#1f5d54;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">Open dashboard</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e3e8e4;font-size:12px;line-height:1.5;color:#66736f">
                This is an automatic status update. Contact the mosque directly if you need help.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `${input.subject}\n\n${input.message}\n\nOpen your dashboard: ${appUrl}\n\nThis is an automatic status update. Contact the mosque directly if you need help.`,
  };
}
