import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canManageMembers } from "@/lib/permissions";

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
  const body = (await request.json()) as { accept?: boolean; token?: string };

  if (body.accept && body.token) {
    const session = await auth();
    const userId = session?.user?.id;
    const email = session?.user?.email?.toLowerCase();
    if (!userId || !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { token: body.token, acceptedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    if (invitation.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Signed-in user does not match invitation email" }, { status: 403 });
    }

    const existing = await prisma.organizationMember.findFirst({
      where: { organizationId: invitation.organizationId, userId },
    });

    if (existing) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return NextResponse.json({ ok: true, alreadyMember: true });
    }

    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const createBody = body as { email?: string; role?: MemberRole };
  const email = createBody.email?.trim().toLowerCase();
  const role = createBody.role;

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

  const inviteUrl = `${base}/sign-up?invite=${invitation.token}`;

  return NextResponse.json({ invitation, inviteUrl });
}
