export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ExpenseStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAllExpenses } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorised", { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgSlug = req.headers.get("x-org-slug") ?? searchParams.get("slug");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug ?? "" } });
  if (!org) return new NextResponse("Not found", { status: 404 });

  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
  });
  if (!member) return new NextResponse("Forbidden", { status: 403 });

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const submitter = searchParams.get("submitter");
  const status = searchParams.get("status");

  const statusFilter =
    status && status !== "all" && Object.values(ExpenseStatus).includes(status as ExpenseStatus)
      ? (status as ExpenseStatus)
      : undefined;

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to + "T23:59:59") : undefined;
  const viewAll = canViewAllExpenses(member.role);

  const where = {
    organizationId: org.id,
    ...(viewAll ? {} : { submittedById: session.user.id }),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(category && category !== "all" ? { categoryId: category } : {}),
    ...(viewAll && submitter && submitter !== "all" ? { submittedById: submitter } : {}),
    ...(fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
      submittedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const rows = [
    ["Date", "Merchant", "Category", "Amount (£)", "Status", "Submitted by", "Notes"],
    ...expenses.map((e) => [
      new Date(e.date).toLocaleDateString("en-GB"),
      e.merchant,
      e.category?.name ?? "",
      Number(e.amount).toFixed(2),
      e.status,
      e.submittedBy.name ?? "",
      e.notes ?? "",
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const filename = `expenses-${org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
