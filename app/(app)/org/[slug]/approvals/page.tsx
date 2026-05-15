import { redirect } from "next/navigation";
import { ExpenseStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove } from "@/lib/role-helpers";
import { ApprovalsTable, type PendingExpenseRow } from "@/components/expenses/approvals-table";

type Props = { params: { slug: string } };

export default async function ApprovalsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  if (!canApprove(access.role)) {
    redirect(`/org/${params.slug}/dashboard`);
  }

  const pending = await prisma.expense.findMany({
    where: { organizationId: access.organization.id, status: ExpenseStatus.pending },
    orderBy: { date: "desc" },
    include: {
      category: true,
      submittedBy: { select: { name: true } },
    },
  });

  const rows: PendingExpenseRow[] = pending.map((e) => ({
    id: e.id,
    merchant: e.merchant,
    amount: e.amount.toString(),
    date: e.date.toISOString(),
    status: "pending",
    category: e.category ? { name: e.category.name } : null,
    submittedBy: { name: e.submittedBy.name },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">Pending expenses awaiting your decision</p>
      </div>

      <ApprovalsTable slug={params.slug} expenses={rows} />
    </div>
  );
}
