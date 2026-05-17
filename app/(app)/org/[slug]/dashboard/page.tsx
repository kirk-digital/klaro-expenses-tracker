import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ExpenseStatus } from "@prisma/client";
import {
  TrendingUp,
  Clock,
  CircleCheck,
  CircleX,
  ChevronRight,
  Receipt,
  Plus,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove, canViewAllExpenses } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
import { getTaxYearStart } from "@/lib/tax-year";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseStatusBadge } from "@/components/expenses/status-badge";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: { slug: string } };

export default async function DashboardPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const orgId = access.organization.id;
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const approvedThisMonth = await prisma.expense.aggregate({
    where: {
      organizationId: orgId,
      status: ExpenseStatus.approved,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
    _count: true,
  });

  const pendingApprovals = await prisma.expense.count({
    where: { organizationId: orgId, status: ExpenseStatus.pending },
  });

  const approvedCount = await prisma.expense.count({
    where: {
      organizationId: orgId,
      status: ExpenseStatus.approved,
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  const rejectedCount = await prisma.expense.count({
    where: {
      organizationId: orgId,
      status: ExpenseStatus.rejected,
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  const taxYearStart = getTaxYearStart();

  const ytdSpend = await prisma.expense.aggregate({
    where: {
      organizationId: orgId,
      status: ExpenseStatus.approved,
      date: { gte: taxYearStart },
    },
    _sum: { amount: true },
  });

  const hasMileageExpenses = await prisma.expense.findFirst({
    where: { organizationId: orgId, expenseType: "mileage" },
    select: { id: true },
  });

  const ytdMileage = await prisma.expense.aggregate({
    where: {
      organizationId: orgId,
      status: ExpenseStatus.approved,
      date: { gte: taxYearStart },
      ...(hasMileageExpenses
        ? { expenseType: "mileage" }
        : { miles: { not: null } }),
    },
    _sum: { miles: true },
  });

  const totalMiles = Number(ytdMileage._sum.miles ?? 0);
  const amapValue =
    totalMiles <= 10000
      ? totalMiles * 0.45
      : 10000 * 0.45 + (totalMiles - 10000) * 0.25;

  const taxYearStartYear = taxYearStart.getFullYear();
  const taxYearLabel = `${taxYearStartYear}–${String(taxYearStartYear + 1).slice(2)}`;
  const taxYearEnd = new Date(Date.UTC(taxYearStartYear + 1, 3, 5));
  const taxYearEndFormatted = taxYearEnd.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const recentWhere = canViewAllExpenses(access.role)
    ? { organizationId: orgId }
    : { organizationId: orgId, submittedById: session.user.id };

  const recent = await prisma.expense.findMany({
    where: recentWhere,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      category: true,
      submittedBy: { select: { name: true } },
    },
  });

  const categoryGroups = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: {
      organizationId: orgId,
      status: ExpenseStatus.approved,
      date: { gte: monthStart, lte: monthEnd },
      categoryId: { not: null },
    },
    _sum: { amount: true },
  });

  const categoryIds = categoryGroups.map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, organizationId: orgId },
  });
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const chartData = categoryGroups
    .map((g) => ({
      name: (g.categoryId && catMap.get(g.categoryId)) || "Uncategorised",
      amount: Number(g._sum.amount ?? 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const pendingList =
    canApprove(access.role) && pendingApprovals > 0
      ? await prisma.expense.findMany({
          where: { organizationId: orgId, status: ExpenseStatus.pending },
          orderBy: { date: "desc" },
          take: 8,
          include: {
            category: true,
            submittedBy: { select: { name: true } },
          },
        })
      : [];

  const totalSpend = Number(approvedThisMonth._sum.amount ?? 0);
  const org = access.organization;

  const spendByCategory = chartData.map((row) => ({
    category: row.name,
    total: row.amount,
  }));

  const fundBreakdown =
    org.type === "charity"
      ? await prisma.$queryRaw<
          { fundType: string; fundName: string | null; total: number }[]
        >`
        SELECT
          e."fundType",
          f.name AS "fundName",
          COALESCE(SUM(e.amount), 0)::float AS total
        FROM "Expense" e
        LEFT JOIN "Fund" f ON f.id = e."fundId"
        WHERE e."organizationId" = ${orgId}
          AND e.status = 'approved'
          AND e."fundType" IS NOT NULL
        GROUP BY e."fundType", f.name
        ORDER BY e."fundType" DESC, f.name ASC
      `
      : [];

  return (
    <div className="space-y-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E3A8A]">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Overview for {org.name}</p>
        </div>
        <Link
          href={`/org/${params.slug}/expenses/new`}
          className="flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3278]"
        >
          <Plus className="h-4 w-4" />
          Add expense
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            YTD spend
          </p>
          <p className="mt-1.5 text-xl font-semibold text-[#1E3A8A] tabular-nums">
            {formatMoney(Number(ytdSpend._sum.amount ?? 0))}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {new Date(taxYearStart).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            – present
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            YTD mileage
          </p>
          <p className="mt-1.5 text-xl font-semibold text-[#1E3A8A] tabular-nums">
            {totalMiles.toLocaleString("en-GB")} mi
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {formatMoney(amapValue)} AMAP value
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Tax year
          </p>
          <p className="mt-1.5 text-xl font-semibold text-[#1E3A8A]">{taxYearLabel}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Ends {taxYearEndFormatted}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href={`/org/${params.slug}/expenses?status=approved`}>
          <Card className="relative overflow-hidden rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-150 hover:border-cyan-400 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:scale-[0.98]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500 rounded-t-xl" />
            <div className="p-4 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  Approved spend
                </p>
                <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#1E3A8A] tabular-nums">
                {formatMoney(totalSpend)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">This month</p>
            </div>
          </Card>
        </Link>
        <Link href={`/org/${params.slug}/approvals`}>
          <Card className="relative overflow-hidden rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-150 hover:border-cyan-400 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:scale-[0.98]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-amber-400 rounded-t-xl" />
            <div className="p-4 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  Pending approvals
                </p>
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#1E3A8A] tabular-nums">
                {pendingApprovals}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Awaiting decision</p>
            </div>
          </Card>
        </Link>
        <Link href={`/org/${params.slug}/expenses?status=approved`}>
          <Card className="relative overflow-hidden rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-150 hover:border-cyan-400 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:scale-[0.98]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#1E3A8A] rounded-t-xl" />
            <div className="p-4 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  Approved count
                </p>
                <CircleCheck className="h-4 w-4 text-[#1E3A8A] shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#1E3A8A] tabular-nums">
                {approvedCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">This month</p>
            </div>
          </Card>
        </Link>
        <Link href={`/org/${params.slug}/expenses?status=rejected`}>
          <Card className="relative overflow-hidden rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-150 hover:border-cyan-400 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:scale-[0.98]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-red-500 rounded-t-xl" />
            <div className="p-4 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  Rejected count
                </p>
                <CircleX className="h-4 w-4 text-red-500 shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#1E3A8A] tabular-nums">
                {rejectedCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">This month</p>
            </div>
          </Card>
        </Link>
      </div>

      {org.type === "charity" && fundBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Fund breakdown</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Approved spend by fund (all time)
            </p>
          </div>
          <div className="divide-y">
            {fundBreakdown
              .filter((f) => f.fundType === "restricted")
              .map((f) => (
                <div
                  key={`restricted-${f.fundName}`}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{f.fundName ?? "Unnamed fund"}</p>
                    <span className="mt-0.5 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Restricted
                    </span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(f.total)}
                  </p>
                </div>
              ))}
            {fundBreakdown
              .filter((f) => f.fundType === "unrestricted")
              .map((f) => (
                <div
                  key="unrestricted"
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">Unrestricted</p>
                    <span className="mt-0.5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Unrestricted
                    </span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(f.total)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-xl lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#1E3A8A]">Spend by category</h2>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleString("en-GB", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="space-y-3">
              {spendByCategory.map((item, i) => {
                const maxAmount = Math.max(...spendByCategory.map((s) => Number(s.total)));
                const pct = maxAmount > 0 ? (Number(item.total) / maxAmount) * 100 : 0;
                const isNavy = i % 2 !== 0;
                return (
                  <div
                    key={item.category}
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) 3.5rem" }}
                  >
                    <p className="truncate text-left text-xs text-slate-500">{item.category}</p>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isNavy ? "bg-[#1E3A8A]" : "bg-cyan-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-right text-xs font-medium text-slate-600 tabular-nums">
                      {formatMoney(Number(item.total))}
                    </p>
                  </div>
                );
              })}
              {spendByCategory.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  No approved expenses this month
                </p>
              )}
            </div>
          </div>
        </Card>

        {canApprove(access.role) && pendingList.length > 0 ? (
          <Card className="rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-[#1E3A8A]">Pending approvals</h2>
              <Link
                href={`/org/${params.slug}/approvals`}
                className="text-xs font-medium text-cyan-500 hover:text-cyan-600"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingList.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/org/${params.slug}/expenses/${expense.id}`}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 group-hover:text-[#1E3A8A]">
                      {expense.merchant}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {expense.submittedBy?.name ?? "Unknown"} · {expense.category?.name ?? "—"}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 tabular-nums">
                      {formatMoney(Number(expense.amount))}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-cyan-400" />
                  </div>
                </Link>
              ))}
              {pendingList.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-slate-400">
                  No expenses awaiting approval
                </p>
              )}
            </div>
          </Card>
        ) : (
          <div />
        )}
      </div>

      <Card className="rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1E3A8A]">Recent expenses</h2>
          <span className="text-xs text-slate-400">Last 10</span>
        </div>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">No expenses yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submit your first expense to get started.
                </p>
              </div>
              <Link
                className={buttonVariants()}
                href={`/org/${params.slug}/expenses/new`}
              >
                Submit your first expense
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/org/${params.slug}/expenses/${e.id}`}
                      >
                        {e.merchant}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <CategoryIcon name={e.category?.name} />
                        {e.category?.name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(Number(e.amount))}
                    </TableCell>
                    <TableCell>{format(e.date, "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <ExpenseStatusBadge status={e.status} />
                    </TableCell>
                    <TableCell>{e.submittedBy.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
