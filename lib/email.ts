import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "noreply@kirkdaledigital.co.uk";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
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
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping invite email");
    return;
  }

  await resend.emails.send({
    from: FROM,
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
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping welcome email");
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  await resend.emails.send({
    from: FROM,
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
