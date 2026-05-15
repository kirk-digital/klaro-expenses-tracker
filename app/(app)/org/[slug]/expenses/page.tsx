import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canViewAllExpenses } from "@/lib/role-helpers";
import { buttonVariants } from "@/components/ui/button";
import { ExpensesTable, type ExpenseListRow } from "@/components/expenses/expenses-table";

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

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-16 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">No expenses yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create an expense to submit receipts and request approval.
            </p>
          </div>
          <Link className={buttonVariants()} href={`/org/${params.slug}/expenses/new`}>
            Submit your first expense
          </Link>
        </div>
      ) : (
        <ExpensesTable slug={params.slug} expenses={rows} />
      )}
    </div>
  );
}
