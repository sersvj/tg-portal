"use server";

import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Notify the primary admin when a client completes a milestone.
 * Safe to call from any server action — never throws.
 */
export async function notifyMilestoneComplete({
  to,
  clientId,
  clientName,
  milestoneName,
  milestoneType,
}: {
  to: string;
  clientId: string;
  clientName: string;
  milestoneName: string;
  milestoneType: string;
}) {
  const adminUrl = `${BASE_URL}/admin/clients/${clientId}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(
      `\n[TG Portal] Milestone completed — email notification skipped (no RESEND_API_KEY)\n` +
      `  Client:    ${clientName}\n` +
      `  Milestone: ${milestoneName} (${milestoneType})\n` +
      `  Admin:     ${to}\n` +
      `  Review:    ${adminUrl}\n`
    );
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `TG Portal <${FROM}>`,
      to,
      subject: `${clientName} completed: ${milestoneName}`,
      html: buildEmailHtml({ clientName, milestoneName, adminUrl }),
    });
  } catch (err) {
    // Never block milestone completion — just surface the error in logs
    console.error(`[TG Portal] Failed to send milestone notification to ${to}:`, err);
  }
}

function buildEmailHtml({
  clientName,
  milestoneName,
  adminUrl,
}: {
  clientName: string;
  milestoneName: string;
  adminUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #f1f5f9;">
            <p style="margin:0 0 12px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#64748b;">
              Tayloe/Gray Portal
            </p>
            <h1 style="margin:0 0 6px;font-size:20px;font-weight:900;color:#1a1a1a;letter-spacing:-0.02em;line-height:1.2;">
              Milestone completed
            </h1>
            <p style="margin:0;font-size:14px;color:#64748b;">
              ${esc(clientName)} · ${esc(milestoneName)}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">
              <strong style="color:#1a1a1a;">${esc(clientName)}</strong> has completed
              <strong style="color:#1a1a1a;">${esc(milestoneName)}</strong>.
              Log in to review their submission.
            </p>
            <a href="${adminUrl}"
               style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:10px 22px;font-size:13px;font-weight:700;letter-spacing:0.01em;">
              View in TG Portal →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              You're receiving this because you're the primary admin for ${esc(clientName)} on TG Portal.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function esc(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
