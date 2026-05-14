import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canManageMembers } from "@/lib/permissions";

export async function GET(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  await requireOrgMember(org.userId, org.organization.id);

  const categories = await prisma.category.findMany({
    where: { organizationId: org.organization.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      organizationId: org.organization.id,
      name,
    },
  });

  return NextResponse.json(category);
}

export async function PATCH(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { id?: string; archived?: boolean };
  if (!body.id || typeof body.archived !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await prisma.category.updateMany({
    where: { id: body.id, organizationId: org.organization.id },
    data: { archived: body.archived },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const category = await prisma.category.findFirst({
    where: { id: body.id, organizationId: org.organization.id },
  });

  return NextResponse.json(category);
}
