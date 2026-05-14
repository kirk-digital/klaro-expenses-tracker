import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ExpenseStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">Pending expenses awaiting your decision</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitter</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No pending expenses.
                </TableCell>
              </TableRow>
            ) : (
              pending.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.submittedBy.name}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
