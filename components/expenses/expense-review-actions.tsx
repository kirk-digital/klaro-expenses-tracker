"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseStatus } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ExpenseReviewActions({
  slug,
  expenseId,
}: {
  slug: string;
  expenseId: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState<ExpenseStatus | null>(null);

  async function submit(status: ExpenseStatus) {
    setLoading(status);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          [ORG_SLUG_HEADER]: slug,
        },
        credentials: "include",
        body: JSON.stringify({ status, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success("Expense updated");
      setComment("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="space-y-2">
        <Label htmlFor="review-comment">Comment</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Required for reject or request revision"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="default"
          disabled={loading !== null}
          onClick={() => submit("approved")}
        >
          {loading === "approved" ? "Saving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={loading !== null}
          onClick={() => submit("rejected")}
        >
          {loading === "rejected" ? "Saving…" : "Reject"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={() => submit("needs_revision")}
        >
          {loading === "needs_revision" ? "Saving…" : "Request revision"}
        </Button>
      </div>
    </div>
  );
}
