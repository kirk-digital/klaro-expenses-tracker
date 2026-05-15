"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckSquare } from "lucide-react";
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
import { CategoryIcon } from "@/components/expenses/category-icon";
import { ApprovalActions } from "@/components/expenses/approval-actions";

export type PendingExpenseRow = {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  status: "pending";
  category: { name: string } | null;
  submittedBy: { name: string };
};

export function ApprovalsTable({
  slug,
  expenses,
}: {
  slug: string;
  expenses: PendingExpenseRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(expenses);

  function removeRow(id: string) {
    setRows((prev) => prev.filter((e) => e.id !== id));
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CheckSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">No pending expenses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All caught up — nothing needs your approval right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitter</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer"
                onClick={() => router.push(`/org/${slug}/expenses/${e.id}`)}
              >
                <TableCell>{e.submittedBy.name}</TableCell>
                <TableCell>
                  <span className="font-medium">{e.merchant}</span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <CategoryIcon name={e.category?.name} />
                    {e.category?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(Number(e.amount))}
                </TableCell>
                <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <ExpenseStatusBadge status={e.status} />
                </TableCell>
                <TableCell onClick={(ev) => ev.stopPropagation()}>
                  <ApprovalActions
                    slug={slug}
                    expenseId={e.id}
                    onSuccess={() => removeRow(e.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((e) => (
          <div key={e.id} className="rounded-xl border bg-card p-4">
            <Link
              href={`/org/${slug}/expenses/${e.id}`}
              className="block transition-colors hover:text-primary"
            >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.merchant}</p>
                <p className="text-xs text-muted-foreground">{e.submittedBy.name}</p>
                <span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CategoryIcon name={e.category?.name} />
                  {e.category?.name ?? "—"}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{formatMoney(Number(e.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(e.date), "MMM d, yyyy")}
                </p>
                <div className="mt-2 flex justify-end">
                  <ExpenseStatusBadge status={e.status} />
                </div>
              </div>
            </div>
            </Link>
            <div className="mt-3 border-t pt-3">
              <ApprovalActions
                slug={slug}
                expenseId={e.id}
                onSuccess={() => removeRow(e.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
