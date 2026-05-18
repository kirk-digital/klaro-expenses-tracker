export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { canViewAllExpenses } from "@/lib/permissions";

type Params = { params: { id: string } };

export async function POST(request: Request, context: Params) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const { id } = context.params;
  const { body } = (await request.json().catch(() => ({}))) as { body?: string };

  if (!body?.trim()) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
    select: { id: true, submittedById: true },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canSee =
    canViewAllExpenses(org.role) || expense.submittedById === org.userId;
  if (!canSee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.expenseComment.create({
    data: {
      expenseId: id,
      authorId: org.userId,
      body: body.trim(),
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
