import type { ExpenseStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const config: Record<ExpenseStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  needs_revision: {
    label: "Needs revision",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const { label, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}
