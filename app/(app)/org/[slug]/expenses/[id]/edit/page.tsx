import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { ExpenseEditShell } from "@/components/expenses/expense-edit-shell";

type Props = { params: { slug: string; id: string } };

export default async function EditExpensePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, organizationId: access.organization.id },
    include: { category: true, receipts: true },
  });

  if (
    !expense ||
    expense.submittedById !== session.user.id ||
    !["needs_revision", "pending"].includes(expense.status)
  ) {
    redirect(`/org/${params.slug}/expenses/${params.id}`);
  }

  const categories = await prisma.category.findMany({
    where: { organizationId: access.organization.id, archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const funds =
    access.organization.type === "charity"
      ? await prisma.fund.findMany({
          where: { organizationId: access.organization.id, archived: false },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [];

  const now = new Date();
  const taxYearStart = new Date(
    now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() < 6)
      ? now.getFullYear() - 1
      : now.getFullYear(),
    3,
    6
  );

  const mileageSums = await prisma.expense.aggregate({
    where: {
      organizationId: access.organization.id,
      expenseType: "mileage",
      date: { gte: taxYearStart },
      NOT: { id: expense.id },
    },
    _sum: { miles: true },
  });
  const milesThisYear = Number(mileageSums._sum.miles ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/org/${params.slug}/expenses/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to expense
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1E3A8A]">Edit expense</h1>
        {expense.status === "needs_revision" && expense.revisionNote ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Revision requested
            </p>
            <p className="text-sm text-amber-800">{expense.revisionNote}</p>
          </div>
        ) : null}
      </div>

      <ExpenseEditShell
        slug={params.slug}
        categories={categories}
        milesThisYear={milesThisYear}
        orgType={access.organization.type}
        funds={funds}
        expense={expense}
        currentStatus={expense.status}
      />
    </div>
  );
}
