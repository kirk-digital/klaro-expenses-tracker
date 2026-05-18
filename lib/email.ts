import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM =
  process.env.RESEND_FROM_EMAIL ??
  process.env.EMAIL_FROM ??
  "noreply@expensestracker.app";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

export async function sendInviteEmail({
  to,
  inviterName,
  orgName,
  inviteUrl,
  role,
}: {
  to: string;
  inviterName: string;
  orgName: string;
  inviteUrl: string;
  role: string;
}) {
  await sendEmail({
    to,
    subject: `You've been invited to join ${orgName} on Expenses Tracker`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited</h2>
        <p>${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
        <p>Click the link below to accept your invitation and create your account:</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Welcome to Expenses Tracker",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Your account has been created. You can now sign in and set up your organisation.</p>
        <a href="${baseUrl}/sign-in" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Sign in
        </a>
      </div>
    `,
  });
}
