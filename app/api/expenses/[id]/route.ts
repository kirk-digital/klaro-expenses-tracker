export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest, type OrgRequestContext } from "@/lib/api-helpers";
import { requireOrgMember, canApprove, canViewAllExpenses } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import {
  expenseApprovedEmail,
  expenseNeedsRevisionEmail,
  expenseRejectedEmail,
} from "@/lib/email-templates";
import { formatMoney } from "@/lib/format";
import { saveReceipt } from "@/lib/storage";
import { recordExpenseHistory } from "@/lib/expense-history";
import { calculateVat, parseVatRate } from "@/lib/vat";
import { notifyUser } from "@/app/api/notifications/stream/route";

type Params = { params: { id: string } };

const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

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
    vatAmount: expense.vatAmount?.toString() ?? null,
  });
}

export async function PATCH(request: Request, context: Params) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const { id } = context.params;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (String(formData.get("action") ?? "") === "resubmit") {
      return handleResubmitForm(org, id, formData);
    }
    return handleSubmitterUpdateForm(org, id, formData);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === "resubmit") {
    return handleResubmitJson(body, org, id);
  }

  if (body.merchant != null && body.amount != null && body.status == null) {
    return handleSubmitterUpdateJson(body, org, id);
  }

  const membership = await requireOrgMember(org.userId, org.organization.id);
  if (!canApprove(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusBody = body as {
    status?: ExpenseStatus;
    comment?: string;
    revisionNote?: string;
  };

  if (!statusBody.status || !Object.values(ExpenseStatus).includes(statusBody.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const needsComment = statusBody.status === ExpenseStatus.rejected;
  if (needsComment && (!statusBody.comment || !statusBody.comment.trim())) {
    return NextResponse.json({ error: "Comment is required for this action" }, { status: 400 });
  }

  const revisionNote =
    statusBody.status === ExpenseStatus.needs_revision
      ? (statusBody.revisionNote ?? statusBody.comment ?? "").trim()
      : null;
  if (statusBody.status === ExpenseStatus.needs_revision) {
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
      organization: { select: { slug: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    (statusBody.status === ExpenseStatus.approved ||
      statusBody.status === ExpenseStatus.rejected ||
      statusBody.status === ExpenseStatus.needs_revision) &&
    expense.submittedById === org.userId
  ) {
    return NextResponse.json(
      { error: "You cannot approve, reject, or request revision on your own expense." },
      { status: 403 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: statusBody.status,
        ...(statusBody.status === ExpenseStatus.needs_revision
          ? { revisionNote }
          : { revisionNote: null }),
      },
    });

    if (statusBody.comment?.trim() && statusBody.status !== ExpenseStatus.needs_revision) {
      await tx.expenseComment.create({
        data: {
          expenseId: expense.id,
          authorId: org.userId,
          body: statusBody.comment.trim(),
        },
      });
    }

    if (expense.submittedById !== org.userId) {
      const message =
        statusBody.status === ExpenseStatus.approved
          ? `Your expense "${expense.merchant}" was approved.`
          : statusBody.status === ExpenseStatus.rejected
            ? `Your expense "${expense.merchant}" was rejected.`
            : statusBody.status === ExpenseStatus.needs_revision
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

  if (expense.submittedById !== org.userId) {
    notifyUser(expense.submittedById);
  }

  if (statusBody.status === ExpenseStatus.approved) {
    await recordExpenseHistory({
      expenseId: expense.id,
      actorId: org.userId,
      action: "approved",
    });
  } else if (statusBody.status === ExpenseStatus.rejected) {
    await recordExpenseHistory({
      expenseId: expense.id,
      actorId: org.userId,
      action: "rejected",
      note: statusBody.comment?.trim(),
    });
  } else if (statusBody.status === ExpenseStatus.needs_revision) {
    await recordExpenseHistory({
      expenseId: expense.id,
      actorId: org.userId,
      action: "needs_revision",
      note: revisionNote ?? undefined,
    });
  }

  if (
    expense.submittedById !== org.userId &&
    (statusBody.status === ExpenseStatus.approved ||
      statusBody.status === ExpenseStatus.rejected ||
      statusBody.status === ExpenseStatus.needs_revision)
  ) {
    const submitterEmail = expense.submittedBy.email;
    if (submitterEmail) {
      const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      const expenseUrl = `${baseUrl}/org/${expense.organization.slug}/expenses/${expense.id}`;
      const submitterName = expense.submittedBy.name ?? "there";
      const merchant = expense.merchant ?? "your expense";
      const formattedAmount = formatMoney(expense.amount.toString());
      const orgName = expense.organization.name;

      if (statusBody.status === ExpenseStatus.approved) {
        const { subject, html } = expenseApprovedEmail({
          submitterName,
          merchant,
          amount: formattedAmount,
          orgName,
          expenseUrl,
        });
        await sendEmail({ to: submitterEmail, subject, html });
      } else if (statusBody.status === ExpenseStatus.rejected) {
        const { subject, html } = expenseRejectedEmail({
          submitterName,
          merchant,
          amount: formattedAmount,
          orgName,
          expenseUrl,
        });
        await sendEmail({ to: submitterEmail, subject, html });
      } else if (statusBody.status === ExpenseStatus.needs_revision && revisionNote) {
        const { subject, html } = expenseNeedsRevisionEmail({
          submitterName,
          merchant,
          revisionNote,
          orgName,
          expenseUrl,
        });
        await sendEmail({ to: submitterEmail, subject, html });
      }
    }
  }

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toString(),
  });
}

async function loadExpenseForPendingEdit(org: OrgRequestContext, id: string) {
  await requireOrgMember(org.userId, org.organization.id);

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
    include: { receipts: true },
  });

  if (!expense) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  if (expense.submittedById !== org.userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (expense.status !== ExpenseStatus.pending) {
    return {
      error: NextResponse.json(
        { error: "Only pending expenses can be edited this way" },
        { status: 400 }
      ),
    };
  }

  return { expense };
}

async function loadExpenseForResubmit(org: OrgRequestContext, id: string) {
  await requireOrgMember(org.userId, org.organization.id);

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
    include: { receipts: true },
  });

  if (!expense) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  if (expense.submittedById !== org.userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (expense.status !== ExpenseStatus.needs_revision) {
    return {
      error: NextResponse.json(
        { error: "Only expenses needing revision can be resubmitted" },
        { status: 400 }
      ),
    };
  }

  return { expense };
}

async function notifyApproversOnResubmit(
  org: OrgRequestContext,
  expenseId: string,
  merchant: string,
  submitterName: string
) {
  const approvers = await prisma.organizationMember.findMany({
    where: {
      organizationId: org.organization.id,
      role: { in: ["owner", "admin", "approver"] },
      userId: { not: org.userId },
    },
    select: { userId: true },
  });

  if (approvers.length > 0) {
    await prisma.notification.createMany({
      data: approvers.map(({ userId }) => ({
        userId,
        organizationId: org.organization.id,
        expenseId,
        message: `${submitterName} resubmitted "${merchant}" for approval.`,
      })),
    });

    for (const { userId } of approvers) {
      notifyUser(userId);
    }
  }
}

async function handleSubmitterFieldUpdate(
  org: OrgRequestContext,
  expense: NonNullable<Awaited<ReturnType<typeof loadExpenseForPendingEdit>>["expense"]>,
  fields: {
    merchant: string;
    amount: number;
    date: Date;
    categoryId: string | null;
    notes: string | null;
    fundType: string | null;
    fundId: string | null;
    vatRate?: string | null;
    vatAmount?: number | null;
    miles?: number;
    amapRate?: number;
  },
  receipt?: { buffer: Buffer; name: string; type: string } | null
) {
  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expense.id },
      data: {
        merchant: fields.merchant,
        amount: fields.amount,
        date: fields.date,
        categoryId: fields.categoryId,
        notes: fields.notes,
        ...(fields.miles != null ? { miles: fields.miles } : {}),
        ...(fields.amapRate != null ? { amapRate: fields.amapRate } : {}),
        ...(fields.fundType ? { fundType: fields.fundType } : { fundType: null }),
        ...(fields.fundId ? { fundId: fields.fundId } : { fundId: null }),
        ...(fields.vatRate !== undefined
          ? { vatRate: fields.vatRate, vatAmount: fields.vatAmount ?? null }
          : {}),
      },
    });

    if (receipt) {
      await tx.receipt.deleteMany({ where: { expenseId: expense.id } });

      const saved = await saveReceipt(org.organization.id, expense.id, {
        buffer: receipt.buffer,
        originalname: receipt.name,
        mimetype: receipt.type,
      });

      await tx.receipt.create({
        data: {
          expenseId: expense.id,
          filename: saved.filename,
          mimeType: receipt.type,
          storagePath: saved.storagePath,
        },
      });
    }
  });

  await recordExpenseHistory({
    expenseId: expense.id,
    actorId: org.userId,
    action: "edited",
  });

  const full = await prisma.expense.findFirst({
    where: { id: expense.id, organizationId: org.organization.id },
    include: { category: true, receipts: true },
  });

  return NextResponse.json({
    ...full,
    amount: full?.amount.toString(),
    miles: full?.miles?.toString() ?? null,
    amapRate: full?.amapRate?.toString() ?? null,
    vatAmount: full?.vatAmount?.toString() ?? null,
  });
}

async function handleSubmitterUpdateForm(
  org: OrgRequestContext,
  id: string,
  formData: FormData
) {
  const loaded = await loadExpenseForPendingEdit(org, id);
  if ("error" in loaded && loaded.error) return loaded.error;
  const expense = loaded.expense!;

  if (expense.expenseType === "mileage") {
    return NextResponse.json(
      { error: "Use JSON to update mileage expenses" },
      { status: 400 }
    );
  }

  const merchant = String(formData.get("merchant") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const categoryId = formData.get("categoryId") ? String(formData.get("categoryId")) : null;
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  const fundType = formData.get("fundType") ? String(formData.get("fundType")) : null;
  const fundId = formData.get("fundId") ? String(formData.get("fundId")) : null;
  const vatRate = parseVatRate(formData.get("vatRate"));
  const file = formData.get("receipt");

  if (!merchant || !amountRaw || !dateRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const amount = Number.parseFloat(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId: org.organization.id,
        archived: false,
      },
    });
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  if (fundId) {
    const fund = await prisma.fund.findFirst({
      where: { id: fundId, organizationId: org.organization.id, archived: false },
    });
    if (!fund) {
      return NextResponse.json({ error: "Invalid fund" }, { status: 400 });
    }
  }

  const vatAmount = calculateVat(amount, vatRate);

  let receipt: { buffer: Buffer; name: string; type: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Receipt must be JPEG, PNG, or PDF" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Receipt must be 10MB or smaller" }, { status: 400 });
    }
    receipt = {
      buffer: Buffer.from(await file.arrayBuffer()),
      name: file.name,
      type: file.type,
    };
  }

  return handleSubmitterFieldUpdate(
    org,
    expense,
    { merchant, amount, date, categoryId, notes, fundType, fundId, vatRate, vatAmount },
    receipt
  );
}

async function handleSubmitterUpdateJson(
  body: Record<string, unknown>,
  org: OrgRequestContext,
  id: string
) {
  const loaded = await loadExpenseForPendingEdit(org, id);
  if ("error" in loaded && loaded.error) return loaded.error;
  const expense = loaded.expense!;

  if (expense.expenseType !== "mileage") {
    return NextResponse.json({ error: "Invalid expense type for JSON update" }, { status: 400 });
  }

  const merchant = String(body.merchant ?? "").trim();
  const amountRaw = String(body.amount ?? "");
  const dateRaw = String(body.date ?? "");
  const notes = body.notes ? String(body.notes) : null;
  const milesRaw = body.miles;
  const amapRateRaw = body.amapRate;

  if (!merchant || !amountRaw || !dateRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const amount = Number.parseFloat(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const miles = Number(milesRaw);
  if (Number.isNaN(miles) || miles <= 0) {
    return NextResponse.json({ error: "Invalid miles" }, { status: 400 });
  }

  const amapRate = Number(amapRateRaw);
  if (Number.isNaN(amapRate) || amapRate <= 0) {
    return NextResponse.json({ error: "Invalid AMAP rate" }, { status: 400 });
  }

  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  let categoryId = body.categoryId ? String(body.categoryId) : expense.categoryId;
  if (!categoryId && body.categoryName) {
    const cat = await prisma.category.findFirst({
      where: { organizationId: org.organization.id, name: String(body.categoryName) },
    });
    categoryId = cat?.id ?? null;
  }

  return handleSubmitterFieldUpdate(org, expense, {
    merchant,
    amount,
    date,
    categoryId,
    notes,
    fundType: null,
    fundId: null,
    miles,
    amapRate,
  });
}

async function handleResubmitForm(
  org: OrgRequestContext,
  id: string,
  formData: FormData
) {
  const loaded = await loadExpenseForResubmit(org, id);
  if ("error" in loaded && loaded.error) return loaded.error;
  const expense = loaded.expense!;

  const merchant = String(formData.get("merchant") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const categoryId = formData.get("categoryId") ? String(formData.get("categoryId")) : null;
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  const fundType = formData.get("fundType") ? String(formData.get("fundType")) : null;
  const fundId = formData.get("fundId") ? String(formData.get("fundId")) : null;
  const vatRate = parseVatRate(formData.get("vatRate"));
  const file = formData.get("receipt");

  if (!merchant || !amountRaw || !dateRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const amount = Number.parseFloat(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId: org.organization.id,
        archived: false,
      },
    });
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  if (fundId) {
    const fund = await prisma.fund.findFirst({
      where: { id: fundId, organizationId: org.organization.id, archived: false },
    });
    if (!fund) {
      return NextResponse.json({ error: "Invalid fund" }, { status: 400 });
    }
  }

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Receipt must be JPEG, PNG, or PDF" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Receipt must be 10MB or smaller" }, { status: 400 });
    }
  }

  const vatAmount = calculateVat(amount, vatRate);

  const submitter = await prisma.user.findUnique({
    where: { id: org.userId },
    select: { name: true },
  });
  const submitterName = submitter?.name ?? "A team member";

  let receiptBuffer: Buffer | null = null;
  let receiptMeta: { name: string; type: string } | null = null;
  if (file instanceof File && file.size > 0) {
    receiptBuffer = Buffer.from(await file.arrayBuffer());
    receiptMeta = { name: file.name, type: file.type };
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expense.id },
      data: {
        merchant,
        amount,
        date,
        categoryId,
        notes,
        status: ExpenseStatus.pending,
        revisionNote: null,
        vatRate,
        vatAmount,
        ...(fundType ? { fundType } : { fundType: null }),
        ...(fundId ? { fundId } : { fundId: null }),
      },
    });

    if (receiptBuffer && receiptMeta) {
      await tx.receipt.deleteMany({ where: { expenseId: expense.id } });

      const saved = await saveReceipt(org.organization.id, expense.id, {
        buffer: receiptBuffer,
        originalname: receiptMeta.name,
        mimetype: receiptMeta.type,
      });

      await tx.receipt.create({
        data: {
          expenseId: expense.id,
          filename: saved.filename,
          mimeType: receiptMeta.type,
          storagePath: saved.storagePath,
        },
      });
    }
  });

  await recordExpenseHistory({
    expenseId: expense.id,
    actorId: org.userId,
    action: "resubmitted",
  });

  try {
    await notifyApproversOnResubmit(org, expense.id, merchant, submitterName);
  } catch (e) {
    console.error("[expenses] Failed to create resubmit notifications", e);
  }

  const full = await prisma.expense.findFirst({
    where: { id: expense.id, organizationId: org.organization.id },
    include: { category: true, receipts: true },
  });

  return NextResponse.json({
    ...full,
    amount: full?.amount.toString(),
    miles: full?.miles?.toString() ?? null,
    amapRate: full?.amapRate?.toString() ?? null,
    vatAmount: full?.vatAmount?.toString() ?? null,
  });
}

async function handleResubmitJson(
  body: Record<string, unknown>,
  org: OrgRequestContext,
  id: string
) {
  const loaded = await loadExpenseForResubmit(org, id);
  if ("error" in loaded && loaded.error) return loaded.error;
  const expense = loaded.expense!;

  if (expense.expenseType !== "mileage") {
    return NextResponse.json({ error: "Invalid expense type for JSON resubmit" }, { status: 400 });
  }

  const merchant = String(body.merchant ?? "").trim();
  const amountRaw = String(body.amount ?? "");
  const dateRaw = String(body.date ?? "");
  const notes = body.notes ? String(body.notes) : null;
  const milesRaw = body.miles;
  const amapRateRaw = body.amapRate;

  if (!merchant || !amountRaw || !dateRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const amount = Number.parseFloat(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const miles = Number(milesRaw);
  if (Number.isNaN(miles) || miles <= 0) {
    return NextResponse.json({ error: "Invalid miles" }, { status: 400 });
  }

  const amapRate = Number(amapRateRaw);
  if (Number.isNaN(amapRate) || amapRate <= 0) {
    return NextResponse.json({ error: "Invalid AMAP rate" }, { status: 400 });
  }

  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  let categoryId = body.categoryId ? String(body.categoryId) : expense.categoryId;
  if (!categoryId && body.categoryName) {
    const cat = await prisma.category.findFirst({
      where: { organizationId: org.organization.id, name: String(body.categoryName) },
    });
    categoryId = cat?.id ?? null;
  }

  const submitter = await prisma.user.findUnique({
    where: { id: org.userId },
    select: { name: true },
  });
  const submitterName = submitter?.name ?? "A team member";

  const updated = await prisma.expense.update({
    where: { id: expense.id },
    data: {
      merchant,
      amount,
      date,
      notes,
      miles,
      amapRate,
      categoryId,
      status: ExpenseStatus.pending,
      revisionNote: null,
    },
    include: { category: true, receipts: true },
  });

  await recordExpenseHistory({
    expenseId: expense.id,
    actorId: org.userId,
    action: "resubmitted",
  });

  try {
    await notifyApproversOnResubmit(org, expense.id, merchant, submitterName);
  } catch (e) {
    console.error("[expenses] Failed to create resubmit notifications", e);
  }

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toString(),
    miles: updated.miles?.toString() ?? null,
    amapRate: updated.amapRate?.toString() ?? null,
  });
}
