import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canManageMembers } from "@/lib/permissions";

export async function GET(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;
  const funds = await prisma.fund.findMany({
    where: { organizationId: org.organization.id, archived: false },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(funds);
}

export async function POST(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;
  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const fund = await prisma.fund.create({
    data: { organizationId: org.organization.id, name },
  });
  return NextResponse.json(fund);
}

export async function PATCH(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;
  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canManageMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { id, archived } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const fund = await prisma.fund.findFirst({
    where: { id, organizationId: org.organization.id },
  });
  if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.fund.update({
    where: { id },
    data: { ...(typeof archived === "boolean" ? { archived } : {}) },
  });
  return NextResponse.json(updated);
}
