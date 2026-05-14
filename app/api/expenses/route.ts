export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { requireOrgMember, canViewAllExpenses } from "@/lib/permissions";
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
    }))
  );
}

export async function POST(request: Request) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  await requireOrgMember(org.userId, org.organization.id);

  const formData = await request.formData();
  const merchant = String(formData.get("merchant") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const categoryId = formData.get("categoryId") ? String(formData.get("categoryId")) : null;
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
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

  const expense = await prisma.expense.create({
    data: {
      organizationId: org.organization.id,
      submittedById: org.userId,
      categoryId,
      amount,
      currency: org.organization.currency,
      merchant,
      date,
      notes,
      status: ExpenseStatus.pending,
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

  const full = await prisma.expense.findFirst({
    where: { id: expense.id, organizationId: org.organization.id },
    include: { category: true, receipts: true },
  });

  return NextResponse.json({
    ...full,
    amount: full?.amount.toString(),
  });
}
