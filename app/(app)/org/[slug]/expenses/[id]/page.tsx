import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove, canViewAllExpenses } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseStatusBadge } from "@/components/expenses/status-badge";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { ExpenseReviewActions } from "@/components/expenses/expense-review-actions";
import { Separator } from "@/components/ui/separator";

type Props = { params: { slug: string; id: string } };

export default async function ExpenseDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, organizationId: access.organization.id },
    include: {
      category: true,
      submittedBy: { select: { id: true, name: true, email: true } },
      receipts: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!expense) {
    notFound();
  }

  const canSee =
    canViewAllExpenses(access.role) || expense.submittedById === session.user.id;
  if (!canSee) {
    notFound();
  }

  const showReview =
    canApprove(access.role) &&
    expense.status === "pending" &&
    expense.submittedById !== session.user.id;

  const receiptUrl =
    expense.receipts[0] &&
    `/api/expenses/${expense.id}/receipt?orgSlug=${encodeURIComponent(params.slug)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/org/${params.slug}/expenses`} className="hover:underline">
              Expenses
            </Link>
            <span className="px-1">/</span>
            <span>{expense.merchant}</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{expense.merchant}</h1>
        </div>
        <ExpenseStatusBadge status={expense.status} />
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Submitted by {expense.submittedBy.name}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatMoney(Number(expense.amount), expense.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{format(expense.date, "MMMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="flex items-center gap-2 font-medium">
              <CategoryIcon name={expense.category?.name} />
              {expense.category?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{format(expense.createdAt, "MMM d, yyyy HH:mm")}</p>
          </div>
          {expense.notes ? (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{expense.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {receiptUrl ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {expense.receipts[0]?.mimeType === "application/pdf" ? (
              <a
                className="text-primary underline-offset-4 hover:underline"
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF receipt
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receiptUrl} alt="Receipt" className="max-h-96 rounded-md border object-contain" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {showReview ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Approve, reject, or request changes</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseReviewActions slug={params.slug} expenseId={expense.id} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Discussion on this expense</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expense.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            expense.comments.map((c) => (
              <div key={c.id}>
                <p className="text-xs text-muted-foreground">
                  {c.author.name} · {format(c.createdAt, "MMM d, yyyy HH:mm")}
                </p>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                <Separator className="mt-3" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
