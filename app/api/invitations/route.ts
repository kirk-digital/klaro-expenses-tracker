import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canManageMembers } from "@/lib/permissions";
import { sendInviteEmail } from "@/lib/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    const invitation = await prisma.invitation.findFirst({
      where: { token, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { organization: { select: { name: true, slug: true } } },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      orgName: invitation.organization.name,
      organizationName: invitation.organization.name,
      organizationSlug: invitation.organization.slug,
    });
  }

  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: org.organization.id,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

export async function POST(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; role?: MemberRole };
  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !role || !Object.values(MemberRole).includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: org.organization.id,
      email,
      role,
      expiresAt,
    },
  });

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const inviteUrl = `${base}/sign-up?token=${invitation.token}`;

  const inviter = await prisma.user.findUnique({
    where: { id: org.userId },
    select: { name: true },
  });

  try {
    await sendInviteEmail({
      to: email,
      inviterName: inviter?.name ?? "A teammate",
      orgName: org.organization.name,
      inviteUrl,
      role,
    });
  } catch (e) {
    console.error("[invitations] Failed to send invite email", e);
  }

  return NextResponse.json({ invitation, inviteUrl });
}
