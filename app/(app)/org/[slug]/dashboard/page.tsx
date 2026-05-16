import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ExpenseStatus } from "@prisma/client";
import {
  TrendingUp,
  Clock,
  CircleCheck,
  CircleX,
  Receipt,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove, canViewAllExpenses } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SpendByCategoryChart } from "@/components/dashboard/spend-chart";
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
  const currency = access.organization.currency;
  const org = access.organization;

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1E3A8A]">Dashboard</h1>
        <p className="text-muted-foreground">Overview for {access.organization.name}</p>
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

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-xl lg:col-span-1">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Spend by category</CardTitle>
            <CardDescription>Approved expenses this calendar month</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendByCategoryChart data={chartData} currency={currency} />
          </CardContent>
        </Card>

        {canApprove(access.role) && pendingList.length > 0 ? (
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Pending approvals</CardTitle>
                <CardDescription>Expenses waiting for a decision</CardDescription>
              </div>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={`/org/${params.slug}/approvals`}
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingList.map((e) => (
                <Link
                  key={e.id}
                  href={`/org/${params.slug}/expenses/${e.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm transition-all duration-150 hover:border-cyan-400 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.submittedBy.name} · {e.category?.name ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(Number(e.amount))}
                  </span>
                  <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div />
        )}
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
          <CardDescription>Latest activity in your organisation</CardDescription>
        </CardHeader>
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
