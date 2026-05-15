import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { ExpenseStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canViewAllExpenses } from "@/lib/role-helpers";
import { buttonVariants } from "@/components/ui/button";
import { ExpensesTable, type ExpenseListRow } from "@/components/expenses/expenses-table";
import { ExpenseFilters } from "@/components/expenses/expense-filters";

type Props = {
  params: { slug: string };
  searchParams: {
    status?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    submittedById?: string;
  };
};

export default async function ExpensesListPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const orgId = access.organization.id;
  const isAdmin = canViewAllExpenses(access.role);

  const statusFilter =
    searchParams.status && Object.values(ExpenseStatus).includes(searchParams.status as ExpenseStatus)
      ? (searchParams.status as ExpenseStatus)
      : undefined;

  const fromDate = searchParams.from ? new Date(searchParams.from) : undefined;
  const toDate = searchParams.to ? new Date(searchParams.to + "T23:59:59") : undefined;

  const where = {
    organizationId: orgId,
    ...(isAdmin ? {} : { submittedById: session.user.id }),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(searchParams.categoryId ? { categoryId: searchParams.categoryId } : {}),
    ...(fromDate || toDate
      ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
      : {}),
    ...(isAdmin && searchParams.submittedById
      ? { submittedById: searchParams.submittedById }
      : {}),
  };

  const [expenses, categories, members] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        submittedBy: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { organizationId: orgId, archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    isAdmin
      ? prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows: ExpenseListRow[] = expenses.map((e) => ({
    id: e.id,
    merchant: e.merchant,
    amount: e.amount.toString(),
    currency: e.currency,
    date: e.date.toISOString(),
    status: e.status,
    category: e.category ? { name: e.category.name } : null,
    submittedBy: { name: e.submittedBy.name },
  }));

  const submitters = members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email ?? m.user.id,
  }));

  const hasActiveFilters = Object.values(searchParams).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and review team spend</p>
        </div>
        <Link className={buttonVariants()} href={`/org/${params.slug}/expenses/new`}>
          New expense
        </Link>
      </div>

      <Suspense fallback={null}>
        <ExpenseFilters
          categories={categories}
          submitters={submitters}
          showSubmitterFilter={isAdmin}
        />
      </Suspense>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {hasActiveFilters ? "No expenses match your filters" : "No expenses yet"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting the filters above."
                : "Create an expense to submit receipts and request approval."}
            </p>
          </div>
          {!hasActiveFilters && (
            <Link className={buttonVariants()} href={`/org/${params.slug}/expenses/new`}>
              Submit your first expense
            </Link>
          )}
        </div>
      ) : (
        <ExpensesTable slug={params.slug} expenses={rows} />
      )}
    </div>
  );
}
