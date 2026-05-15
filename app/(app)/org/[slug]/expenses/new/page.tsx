import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { ExpenseTypeSelector } from "@/components/expenses/expense-type-selector";

type Props = { params: { slug: string } };

export default async function NewExpensePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

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
    },
    _sum: { miles: true },
  });
  const milesThisYear = Number(mileageSums._sum.miles ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/org/${params.slug}/expenses`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Expenses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New expense</h1>
        <p className="text-muted-foreground">Submit an expense for approval</p>
      </div>
      <ExpenseTypeSelector
        slug={params.slug}
        categories={categories}
        milesThisYear={milesThisYear}
        orgType={access.organization.type}
        funds={funds}
      />
    </div>
  );
}
