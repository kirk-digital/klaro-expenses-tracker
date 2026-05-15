import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { ExpenseCreateForm } from "@/components/expenses/expense-create-form";

type Props = { params: { slug: string } };

export default async function NewExpensePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const categories = await prisma.category.findMany({
    where: { organizationId: access.organization.id, archived: false },
    orderBy: { name: "asc" },
  });

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
      <ExpenseCreateForm slug={params.slug} categories={categories} />
    </div>
  );
}
