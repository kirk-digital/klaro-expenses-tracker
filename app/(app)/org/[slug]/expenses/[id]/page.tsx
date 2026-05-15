import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove, canViewAllExpenses } from "@/lib/role-helpers";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseStatusBadge } from "@/components/expenses/status-badge";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { ExpenseReviewActions } from "@/components/expenses/expense-review-actions";
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
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link
              href={`/org/${params.slug}/expenses`}
              className="transition-colors hover:text-foreground"
            >
              Expenses
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{expense.merchant}</span>
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
              {formatMoney(Number(expense.amount))}
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
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptUrl}
                  alt="Receipt"
                  className="mx-auto max-h-[480px] w-auto object-contain"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showReview ? (
        <ExpenseReviewActions slug={params.slug} expenseId={expense.id} />
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
            <div className="space-y-3">
              {expense.comments.map((c) => (
                <div key={c.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{c.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(c.createdAt, "MMM d, HH:mm")}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
