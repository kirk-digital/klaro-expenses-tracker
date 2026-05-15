"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
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
  currency: string;
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
  const [rows, setRows] = useState(expenses);

  function removeRow(id: string) {
    setRows((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="rounded-xl border bg-card">
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
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No pending expenses.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.submittedBy.name}</TableCell>
                <TableCell>
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/org/${slug}/expenses/${e.id}`}
                  >
                    {e.merchant}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <CategoryIcon name={e.category?.name} />
                    {e.category?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(Number(e.amount), e.currency)}
                </TableCell>
                <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <ExpenseStatusBadge status={e.status} />
                </TableCell>
                <TableCell>
                  <ApprovalActions
                    slug={slug}
                    expenseId={e.id}
                    onSuccess={() => removeRow(e.id)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
