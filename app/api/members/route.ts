import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canManageMembers } from "@/lib/permissions";

export async function GET(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  await requireOrgMember(org.userId, org.organization.id);

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.organization.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function PATCH(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; role?: MemberRole };
  if (!body.userId || !body.role || !Object.values(MemberRole).includes(body.role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const target = await prisma.organizationMember.findFirst({
    where: { organizationId: org.organization.id, userId: body.userId },
  });

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.role === MemberRole.owner && body.userId !== org.userId) {
    const owners = await prisma.organizationMember.count({
      where: { organizationId: org.organization.id, role: MemberRole.owner },
    });
    if (owners <= 1 && body.role !== MemberRole.owner) {
      return NextResponse.json({ error: "Organisation must keep at least one owner" }, { status: 400 });
    }
  }

  const updated = await prisma.organizationMember.update({
    where: { id: target.id },
    data: { role: body.role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (userId === org.userId && membership.role === MemberRole.owner) {
    return NextResponse.json({ error: "Owners cannot remove themselves" }, { status: 400 });
  }

  const target = await prisma.organizationMember.findFirst({
    where: { organizationId: org.organization.id, userId },
  });

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.role === MemberRole.owner) {
    const owners = await prisma.organizationMember.count({
      where: { organizationId: org.organization.id, role: MemberRole.owner },
    });
    if (owners <= 1) {
      return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 });
    }
  }

  await prisma.organizationMember.delete({ where: { id: target.id } });

  return NextResponse.json({ ok: true });
}
