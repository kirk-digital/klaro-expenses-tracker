import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ExpenseStatus } from "@prisma/client";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview for {access.organization.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden rounded-xl border-l-4 border-green-500">
          <CardHeader className="pb-2">
            <TrendingUp className="absolute right-4 top-4 h-5 w-5 text-green-500" />
            <CardDescription>Approved spend (this month)</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatMoney(totalSpend, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-l-4 border-amber-500">
          <CardHeader className="pb-2">
            <Clock className="absolute right-4 top-4 h-5 w-5 text-amber-500" />
            <CardDescription>Pending approvals</CardDescription>
            <CardTitle className="text-3xl font-bold">{pendingApprovals}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <CheckCircle className="absolute right-4 top-4 h-5 w-5 text-blue-500" />
            <CardDescription>Approved (this month)</CardDescription>
            <CardTitle className="text-3xl font-bold">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-l-4 border-red-500">
          <CardHeader className="pb-2">
            <XCircle className="absolute right-4 top-4 h-5 w-5 text-red-500" />
            <CardDescription>Rejected (this month)</CardDescription>
            <CardTitle className="text-3xl font-bold">{rejectedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-xl lg:col-span-1">
          <CardHeader>
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
                  className="flex items-center justify-between rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{e.merchant}</p>
                    <p className="text-muted-foreground">
                      {e.submittedBy.name} · {e.category?.name ?? "—"}
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">
                    {formatMoney(Number(e.amount), e.currency)}
                  </span>
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
              <Receipt className="h-12 w-12 text-muted-foreground" />
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
                      {formatMoney(Number(e.amount), e.currency)}
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
