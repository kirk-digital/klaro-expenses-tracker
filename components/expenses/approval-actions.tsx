"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type Action = "approve" | "reject";

export function ApprovalActions({
  slug,
  expenseId,
  onSuccess,
}: {
  slug: string;
  expenseId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);

  async function submit(action: Action) {
    setLoading(action);
    try {
      const status = action === "approve" ? "approved" : "rejected";
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          [ORG_SLUG_HEADER]: slug,
        },
        credentials: "include",
        body: JSON.stringify({
          status,
          ...(action === "reject" ? { comment: "Rejected from approvals list" } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      onSuccess?.();
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      <Button
        type="button"
        size="sm"
        className="min-h-[44px] flex-1 bg-green-600 px-2 text-xs text-white hover:bg-green-700 sm:min-h-0 sm:flex-none sm:px-3 sm:text-sm"
        disabled={loading !== null}
        onClick={() => submit("approve")}
      >
        {loading === "approve" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Approve"
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="min-h-[44px] flex-1 px-2 text-xs sm:min-h-0 sm:flex-none sm:px-3 sm:text-sm"
        disabled={loading !== null}
        onClick={() => submit("reject")}
      >
        {loading === "reject" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Reject"
        )}
      </Button>
    </div>
  );
}
