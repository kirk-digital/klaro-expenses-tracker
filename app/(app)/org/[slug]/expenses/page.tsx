import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canViewAllExpenses } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseStatusBadge } from "@/components/expenses/status-badge";

type Props = { params: { slug: string } };

export default async function ExpensesListPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const orgId = access.organization.id;
  const where = canViewAllExpenses(access.role)
    ? { organizationId: orgId }
    : { organizationId: orgId, submittedById: session.user.id };

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      submittedBy: { select: { name: true } },
    },
  });

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

      <div className="rounded-lg border bg-card">
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
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No expenses yet.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/org/${params.slug}/expenses/${e.id}`}
                    >
                      {e.merchant}
                    </Link>
                  </TableCell>
                  <TableCell>{e.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(Number(e.amount), e.currency)}
                  </TableCell>
                  <TableCell>{format(e.date, "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <ExpenseStatusBadge status={e.status} />
                  </TableCell>
                  <TableCell>{e.submittedBy.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
