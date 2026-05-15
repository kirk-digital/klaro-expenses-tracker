import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; userId?: string };

  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();

  if (!userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (body.userId && body.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findFirst({
    where: { token, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { organization: { select: { slug: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  if (invitation.email.toLowerCase() !== email) {
    return NextResponse.json(
      { error: "Signed-in user does not match invitation email" },
      { status: 403 }
    );
  }

  const existing = await prisma.organizationMember.findFirst({
    where: { organizationId: invitation.organizationId, userId },
  });

  if (existing) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return NextResponse.json({
      success: true,
      alreadyMember: true,
      orgSlug: invitation.organization.slug,
    });
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

  return NextResponse.json({
    success: true,
    orgSlug: invitation.organization.slug,
  });
}
