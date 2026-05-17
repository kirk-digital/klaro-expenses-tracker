import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canApprove as roleCanApprove, canViewAllExpenses } from "@/lib/role-helpers";
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
      fund: true,
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

  const currentUserId = session.user.id;
  const isSubmitter = expense.submittedById === currentUserId;
  const canApprove =
    roleCanApprove(access.role) && expense.submittedById !== session.user.id;
  const showReview = canApprove && expense.status === "pending";
  const needsRevision = expense.status === "needs_revision";

  const receiptUrl =
    expense.receipts[0] &&
    `/api/expenses/${expense.id}/receipt?orgSlug=${encodeURIComponent(params.slug)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/org/${params.slug}/expenses`}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Expenses</span>
            </Link>
          </div>
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
          {expense.expenseType === "mileage" && expense.miles !== null && (
            <>
              <div>
                <p className="text-muted-foreground">Miles driven</p>
                <p className="font-medium">{Number(expense.miles).toLocaleString()} miles</p>
              </div>
              <div>
                <p className="text-muted-foreground">AMAP rate</p>
                <p className="font-medium">{Number(expense.amapRate) * 100}p/mile</p>
              </div>
            </>
          )}
          {expense.fundType && (
            <div>
              <p className="text-muted-foreground">Fund</p>
              <p className="font-medium capitalize">
                {expense.fundType}
                {expense.fund?.name && ` — ${expense.fund.name}`}
              </p>
            </div>
          )}
          {expense.notes ? (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{expense.notes}</p>
            </div>
          ) : null}
          {expense.status === "needs_revision" ? (
            <div className="sm:col-span-2">
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Revision requested
                </p>
                <p className="text-sm text-amber-800">
                  {expense.revisionNote ??
                    "This expense has been sent back for revision."}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {needsRevision && isSubmitter ? (
        <div className="flex justify-end">
          <Link
            href={`/org/${params.slug}/expenses/${expense.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A8A]/90"
          >
            <Pencil className="h-4 w-4" />
            Edit &amp; resubmit
          </Link>
        </div>
      ) : null}

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
      ) : expense.status === "pending" && isSubmitter ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Awaiting approval
        </div>
      ) : null}

      {needsRevision && !isSubmitter ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Awaiting revision from {expense.submittedBy.name}. You&apos;ll be notified when
          they resubmit.
        </div>
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
