"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { ExpenseStatus } from "@prisma/client";
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

export type ExpenseListRow = {
  id: string;
  merchant: string;
  amount: string;
  currency: string;
  date: string;
  status: ExpenseStatus;
  category: { name: string } | null;
  submittedBy: { name: string };
};

export function ExpensesTable({
  slug,
  expenses,
}: {
  slug: string;
  expenses: ExpenseListRow[];
}) {
  const router = useRouter();

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted by</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow
              key={e.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/org/${slug}/expenses/${e.id}`)}
            >
              <TableCell className="font-medium">{e.merchant}</TableCell>
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
              <TableCell>{e.submittedBy.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
