import { NextResponse } from "next/server";
import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canApprove, canViewAllExpenses } from "@/lib/permissions";
import { sendStatusChangeEmail } from "@/lib/email";

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
    revisionNote?: string;
  };

  if (!body.status || !Object.values(ExpenseStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const needsComment = body.status === ExpenseStatus.rejected;
  if (needsComment && (!body.comment || !body.comment.trim())) {
    return NextResponse.json({ error: "Comment is required for this action" }, { status: 400 });
  }

  const revisionNote =
    body.status === ExpenseStatus.needs_revision
      ? (body.revisionNote ?? body.comment ?? "").trim()
      : null;
  if (body.status === ExpenseStatus.needs_revision) {
    if (!revisionNote) {
      return NextResponse.json({ error: "Revision reason is required" }, { status: 400 });
    }
    if (revisionNote.length < 10) {
      return NextResponse.json(
        { error: "Revision reason must be at least 10 characters" },
        { status: 400 }
      );
    }
  }

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      organization: { select: { slug: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: body.status,
        ...(body.status === ExpenseStatus.needs_revision
          ? { revisionNote }
          : { revisionNote: null }),
      },
    });

    if (body.comment?.trim() && body.status !== ExpenseStatus.needs_revision) {
      await tx.expenseComment.create({
        data: {
          expenseId: expense.id,
          authorId: org.userId,
          body: body.comment.trim(),
        },
      });
    }

    if (expense.submittedById !== org.userId) {
      const message =
        body.status === ExpenseStatus.approved
          ? `Your expense "${expense.merchant}" was approved.`
          : body.status === ExpenseStatus.rejected
            ? `Your expense "${expense.merchant}" was rejected.`
            : body.status === ExpenseStatus.needs_revision
              ? `Your expense "${expense.merchant}" was sent back for revision${revisionNote ? `: ${revisionNote}` : "."}`
              : `Your expense "${expense.merchant}" was updated.`;

      await tx.notification.create({
        data: {
          userId: expense.submittedById,
          organizationId: org.organization.id,
          message,
          expenseId: expense.id,
        },
      });
    }

    return next;
  });

  if (
    expense.submittedById !== org.userId &&
    (body.status === ExpenseStatus.approved ||
      body.status === ExpenseStatus.rejected ||
      body.status === ExpenseStatus.needs_revision)
  ) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendStatusChangeEmail({
        to: expense.submittedBy.email,
        submitterName: expense.submittedBy.name ?? "there",
        merchant: expense.merchant ?? "your expense",
        status: body.status,
        comment: revisionNote ?? body.comment ?? null,
        expenseUrl: `${baseUrl}/org/${expense.organization.slug}/expenses/${expense.id}`,
      });
    } catch (emailErr) {
      console.error("Status-change email failed:", emailErr);
    }
  }

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toString(),
  });
}
