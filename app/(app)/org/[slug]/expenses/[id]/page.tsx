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
import { ExpenseComments } from "@/components/expenses/expense-comments";
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

  const isReceiptImage = (filename: string, mimeType: string) =>
    mimeType.startsWith("image/") ||
    /\.(svg|png|jpe?g)$/i.test(filename);

  const isReceiptPdf = (filename: string, mimeType: string) =>
    mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");

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

      {expense.expenseType !== "mileage" && expense.receipts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Receipt</h2>
          {expense.receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="overflow-hidden rounded-lg border border-slate-100"
            >
              {isReceiptImage(receipt.filename, receipt.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/receipts/${receipt.id}`}
                  alt="Receipt"
                  className="w-full"
                />
              ) : isReceiptPdf(receipt.filename, receipt.mimeType) ? (
                <a
                  href={`/api/receipts/${receipt.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-[#1E3A8A] hover:underline"
                >
                  View PDF receipt
                </a>
              ) : (
                <a
                  href={`/api/receipts/${receipt.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-[#1E3A8A] hover:underline"
                >
                  Download receipt
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {expense.expenseType === "receipted" && expense.receipts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-slate-400">No receipt attached</p>
        </div>
      )}

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

      <ExpenseComments
        expenseId={expense.id}
        slug={params.slug}
        initialComments={expense.comments}
        currentUserName={session.user.name ?? ""}
      />
    </div>
  );
}
