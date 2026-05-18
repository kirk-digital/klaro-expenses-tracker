export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ExpenseStatus, ExpenseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest, type OrgRequestContext } from "@/lib/api-helpers";
import { requireOrgMember, canViewAllExpenses } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { expenseSubmittedEmail } from "@/lib/email-templates";
import { formatMoney } from "@/lib/format";
import { saveReceipt } from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const orgId = org.organization.id;
  const base = { organizationId: orgId };
  const where = canViewAllExpenses(org.role) ? base : { ...base, submittedById: org.userId };

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(
    expenses.map((e) => ({
      ...e,
      amount: e.amount.toString(),
      miles: e.miles?.toString() ?? null,
      amapRate: e.amapRate?.toString() ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  await requireOrgMember(org.userId, org.organization.id);

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return handleJsonExpense(request, org);
  }

  return handleFormExpense(request, org);
}

async function handleJsonExpense(request: Request, org: OrgRequestContext) {
  const body = await request.json().catch(() => ({}));
  const expenseType: ExpenseType =
    body.expenseType === "mileage" ? "mileage" : "receipted";

  if (expenseType !== "mileage") {
    return NextResponse.json({ error: "Invalid expense type for JSON submission" }, { status: 400 });
  }

  const merchant = String(body.merchant ?? "").trim();
  const amountRaw = String(body.amount ?? "");
  const dateRaw = String(body.date ?? "");
  const notes = body.notes ? String(body.notes) : null;
  const milesRaw = body.miles;
  const amapRateRaw = body.amapRate;
  const { fundType, fundId } = body;

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

  let categoryId = body.categoryId ? String(body.categoryId) : null;
  if (!categoryId && body.categoryName) {
    const cat = await prisma.category.findFirst({
      where: { organizationId: org.organization.id, name: String(body.categoryName) },
    });
    categoryId = cat?.id ?? null;
  }

  if (fundId) {
    const fund = await prisma.fund.findFirst({
      where: { id: String(fundId), organizationId: org.organization.id, archived: false },
    });
    if (!fund) {
      return NextResponse.json({ error: "Invalid fund" }, { status: 400 });
    }
  }

  const initialStatus = org.organization.requiresApproval
    ? ExpenseStatus.pending
    : ExpenseStatus.approved;

  const expense = await prisma.expense.create({
    data: {
      organizationId: org.organization.id,
      submittedById: org.userId,
      categoryId,
      expenseType: "mileage",
      amount,
      merchant,
      date,
      notes,
      miles,
      amapRate,
      status: initialStatus,
      ...(fundType ? { fundType: String(fundType) } : {}),
      ...(fundId ? { fundId: String(fundId) } : {}),
    },
  });

  return finishExpenseResponse(expense.id, org, merchant, amount);
}

async function handleFormExpense(request: Request, org: OrgRequestContext) {
  const formData = await request.formData();
  const merchant = String(formData.get("merchant") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const categoryId = formData.get("categoryId") ? String(formData.get("categoryId")) : null;
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  const fundType = formData.get("fundType") ? String(formData.get("fundType")) : null;
  const fundId = formData.get("fundId") ? String(formData.get("fundId")) : null;
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Receipt file is required" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Receipt must be JPEG, PNG, or PDF" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Receipt must be 10MB or smaller" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const initialStatus = org.organization.requiresApproval
    ? ExpenseStatus.pending
    : ExpenseStatus.approved;

  const expense = await prisma.expense.create({
    data: {
      organizationId: org.organization.id,
      submittedById: org.userId,
      categoryId,
      expenseType: "receipted",
      amount,
      merchant,
      date,
      notes,
      status: initialStatus,
      ...(fundType ? { fundType } : {}),
      ...(fundId ? { fundId } : {}),
    },
  });

  const saved = await saveReceipt(org.organization.id, expense.id, {
    buffer,
    originalname: file.name,
    mimetype: file.type,
  });

  await prisma.receipt.create({
    data: {
      expenseId: expense.id,
      filename: saved.filename,
      mimeType: file.type,
      storagePath: saved.storagePath,
    },
  });

  return finishExpenseResponse(expense.id, org, merchant, amount);
}

async function finishExpenseResponse(
  expenseId: string,
  org: OrgRequestContext,
  merchant: string,
  amount: number
) {
  const full = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId: org.organization.id },
    include: { category: true, receipts: true, submittedBy: { select: { name: true } } },
  });

  const submitterName = full?.submittedBy?.name ?? "A team member";

  try {
    if (org.organization.requiresApproval) {
      const approvers = await prisma.organizationMember.findMany({
        where: {
          organizationId: org.organization.id,
          role: { in: ["owner", "admin", "approver"] },
          userId: { not: org.userId },
        },
        select: {
          userId: true,
          user: { select: { email: true, name: true } },
        },
      });

      if (approvers.length > 0) {
        await prisma.notification.createMany({
          data: approvers.map(({ userId }) => ({
            userId,
            organizationId: org.organization.id,
            message: `${submitterName} submitted "${merchant}" for ${org.organization.currency} ${amount.toFixed(2)} — awaiting approval.`,
            expenseId,
          })),
        });

        const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
        const expenseUrl = `${baseUrl}/org/${org.organization.slug}/expenses/${expenseId}`;
        const formattedAmount = formatMoney(amount);

        for (const approver of approvers) {
          if (!approver.user.email) continue;
          const { subject, html } = expenseSubmittedEmail({
            approverName: approver.user.name ?? "there",
            submitterName,
            merchant,
            amount: formattedAmount,
            orgName: org.organization.name,
            expenseUrl,
          });
          await sendEmail({ to: approver.user.email, subject, html });
        }
      }
    }
  } catch (e) {
    console.error("[expenses] Failed to create notifications", e);
  }

  return NextResponse.json({
    ...full,
    amount: full?.amount.toString(),
    miles: full?.miles?.toString() ?? null,
    amapRate: full?.amapRate?.toString() ?? null,
  });
}
