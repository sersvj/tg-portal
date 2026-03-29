import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export async function sendInviteEmail({
  to,
  inviteUrl,
  companyName,
}: {
  to: string;
  inviteUrl: string;
  companyName: string;
}) {
  return resend.emails.send({
    from: `TG Portal <${FROM}>`,
    to,
    subject: `You've been invited to the ${companyName} portal`,
    html: `
      <p>You've been invited to access the <strong>${companyName}</strong> client portal.</p>
      <p><a href="${inviteUrl}">Click here to set up your account</a></p>
      <p>This link expires in 72 hours.</p>
    `,
  });
}

export async function sendAdminInviteEmail({
  to,
  inviteUrl,
}: {
  to: string;
  inviteUrl: string;
}) {
  return resend.emails.send({
    from: `TG Portal <${FROM}>`,
    to,
    subject: "You've been invited to join TG Portal as an admin",
    html: `
      <p>You've been invited to join the Tayloe/Gray admin team.</p>
      <p><a href="${inviteUrl}">Click here to set up your account</a></p>
      <p>This link expires in 72 hours.</p>
    `,
  });
}

export async function sendAdminNotification({
  to,
  clientName,
  milestoneName,
}: {
  to: string;
  clientName: string;
  milestoneName: string;
}) {
  return resend.emails.send({
    from: `TG Portal <${FROM}>`,
    to,
    subject: `${clientName} completed: ${milestoneName}`,
    html: `
      <p><strong>${clientName}</strong> has completed the milestone: <strong>${milestoneName}</strong>.</p>
      <p>Log in to review their submission.</p>
    `,
  });
}
