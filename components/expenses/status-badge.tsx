import type { ExpenseStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<ExpenseStatus, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100",
  approved: "bg-green-100 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100",
  rejected: "bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100",
  needs_revision:
    "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950 dark:text-orange-100",
};

const labels: Record<ExpenseStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <Badge variant="outline" className={cn("border", styles[status])}>
      {labels[status]}
    </Badge>
  );
}
