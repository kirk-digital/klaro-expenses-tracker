import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpenseStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canViewAllExpenses } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ExpensesTable, type ExpenseListRow } from "@/components/expenses/expenses-table";

type Props = {
  params: { slug: string };
  searchParams: {
    from?: string;
    to?: string;
    category?: string;
    submitter?: string;
    status?: string;
  };
};

const filterInputClass =
  "appearance-none h-11 min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent sm:h-9 sm:min-h-0";
const filterSelectClass = filterInputClass;

export default async function ReportsPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const org = access.organization;
  const viewAll = canViewAllExpenses(access.role);

  const { from, to, category, submitter, status } = searchParams;

  const statusFilter =
    status && status !== "all" && Object.values(ExpenseStatus).includes(status as ExpenseStatus)
      ? (status as ExpenseStatus)
      : undefined;

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to + "T23:59:59") : undefined;

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

  const [expenses, categories, members] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: true,
        submittedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({
      where: { organizationId: org.id, archived: false },
      orderBy: { name: "asc" },
    }),
    viewAll
      ? prisma.organizationMember.findMany({
          where: { organizationId: org.id },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const approvedAmount = expenses
    .filter((e) => e.status === ExpenseStatus.approved)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const rows: ExpenseListRow[] = expenses.map((e) => ({
    id: e.id,
    merchant: e.merchant,
    amount: e.amount.toString(),
    date: e.date.toISOString(),
    status: e.status,
    category: e.category ? { name: e.category.name } : null,
    submittedBy: { name: e.submittedBy.name },
  }));

  const exportParams = new URLSearchParams({
    slug: params.slug,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(submitter ? { submitter } : {}),
  });

  const hasFilters = Boolean(from || to || category || submitter || status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1E3A8A]">Reports</h1>
        <p className="text-muted-foreground">Filter expenses and export for accounting</p>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <div className="w-full space-y-1.5 sm:w-auto">
          <label htmlFor="from" className="text-xs text-muted-foreground">
            Date from
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className={filterInputClass}
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-auto">
          <label htmlFor="to" className="text-xs text-muted-foreground">
            Date to
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className={filterInputClass}
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-auto">
          <label htmlFor="category" className="text-xs text-muted-foreground">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? "all"}
            className={filterSelectClass}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {viewAll && (
          <div className="w-full space-y-1.5 sm:w-auto">
            <label htmlFor="submitter" className="text-xs text-muted-foreground">
              Submitted by
            </label>
            <select
              id="submitter"
              name="submitter"
              defaultValue={submitter ?? "all"}
              className={filterSelectClass}
            >
              <option value="all">Everyone</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name ?? m.user.email ?? m.user.id}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="w-full space-y-1.5 sm:w-auto">
          <label htmlFor="status" className="text-xs text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? "all"}
            className={filterSelectClass}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_revision">Needs revision</option>
          </select>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button type="submit" className="min-h-[44px] w-full sm:w-auto">
            Apply filters
          </Button>
          {hasFilters && (
            <Link
              href={`/org/${params.slug}/reports`}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:w-auto"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Total expenses
          </p>
          <p className="mt-1.5 text-xl font-semibold text-[#1E3A8A] tabular-nums">
            {expenses.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Total amount
          </p>
          <p className="mt-1.5 text-xl font-semibold text-[#1E3A8A] tabular-nums">
            {formatMoney(totalAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Approved amount
          </p>
          <p className="mt-1.5 text-xl font-semibold text-[#1E3A8A] tabular-nums">
            {formatMoney(approvedAmount)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-600">
            {rows.length === 0
              ? "No expenses match your filters"
              : `${rows.length} expense${rows.length === 1 ? "" : "s"}`}
          </h2>
          <a
            href={`/api/reports/export?${exportParams.toString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
          >
            ↓ Export CSV
          </a>
        </div>
        {rows.length > 0 && <ExpensesTable slug={params.slug} expenses={rows} />}
      </div>
    </div>
  );
}
