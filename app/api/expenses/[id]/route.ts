import { NextResponse } from "next/server";
import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canApprove, canViewAllExpenses } from "@/lib/permissions";

type Params = { params: { id: string } };

export async function GET(request: Request, context: Params) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const { id } = context.params;

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
    include: {
      category: true,
      submittedBy: { select: { id: true, name: true, email: true } },
      receipts: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canSee =
    canViewAllExpenses(org.role) || expense.submittedById === org.userId;
  if (!canSee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...expense,
    amount: expense.amount.toString(),
  });
}

export async function PATCH(request: Request, context: Params) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canApprove(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  const body = (await request.json()) as {
    status?: ExpenseStatus;
    comment?: string;
  };

  if (!body.status || !Object.values(ExpenseStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const needsComment =
    body.status === ExpenseStatus.rejected || body.status === ExpenseStatus.needs_revision;
  if (needsComment && (!body.comment || !body.comment.trim())) {
    return NextResponse.json({ error: "Comment is required for this action" }, { status: 400 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.expense.update({
      where: { id: expense.id },
      data: { status: body.status },
    });

    if (body.comment?.trim()) {
      await tx.expenseComment.create({
        data: {
          expenseId: expense.id,
          authorId: org.userId,
          body: body.comment.trim(),
        },
      });
    }

    if (expense.submittedById !== org.userId) {
      const label =
        body.status === ExpenseStatus.approved
          ? "approved"
          : body.status === ExpenseStatus.rejected
            ? "rejected"
            : body.status === ExpenseStatus.needs_revision
              ? "marked as needing revision"
              : "updated";

      await tx.notification.create({
        data: {
          userId: expense.submittedById,
          organizationId: org.organization.id,
          message: `Your expense "${expense.merchant}" was ${label}.`,
        },
      });
    }

    return next;
  });

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toString(),
  });
}
