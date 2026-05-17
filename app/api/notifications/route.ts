import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest, requireSessionUserId } from "@/lib/api-helpers";
import { requireOrgMember } from "@/lib/permissions";

export async function GET(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  await requireOrgMember(org.userId, org.organization.id);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: org.userId,
      organizationId: org.organization.id,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const session = await requireSessionUserId();
    if (session instanceof Response) return session;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: session.userId },
    });
    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  }

  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  await requireOrgMember(org.userId, org.organization.id);

  const body = (await request.json()) as { ids?: string[]; markAllRead?: boolean };

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: {
        userId: org.userId,
        organizationId: org.organization.id,
      },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.ids?.length) {
    return NextResponse.json({ error: "ids or markAllRead required" }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: body.ids },
      userId: org.userId,
      organizationId: org.organization.id,
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await requireSessionUserId();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.userId },
  });
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
