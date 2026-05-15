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
    <>
      <div className="space-y-2 md:hidden">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="flex cursor-pointer items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
            onClick={() => router.push(`/org/${slug}/expenses/${e.id}`)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{e.merchant}</p>
                <ExpenseStatusBadge status={e.status} />
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CategoryIcon name={e.category?.name} />
                {e.category?.name ?? "—"} · {format(new Date(e.date), "d MMM yyyy")}
              </p>
            </div>
            <p className="ml-4 shrink-0 text-sm font-semibold tabular-nums">
              {formatMoney(Number(e.amount))}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden rounded-xl border bg-card md:block">
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
                  {formatMoney(Number(e.amount))}
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
    </>
  );
}
