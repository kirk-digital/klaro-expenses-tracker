"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseStatus } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ExpenseReviewActions({
  slug,
  expenseId,
}: {
  slug: string;
  expenseId: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [loading, setLoading] = useState<ExpenseStatus | null>(null);

  async function submit(
    status: ExpenseStatus,
    options?: { revisionNote?: string }
  ) {
    setLoading(status);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          [ORG_SLUG_HEADER]: slug,
        },
        credentials: "include",
        body: JSON.stringify({
          status,
          comment: status === "needs_revision" ? undefined : comment,
          revisionNote: options?.revisionNote,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success("Expense updated");
      setComment("");
      setRevisionNote("");
      setRevisionOpen(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function handleSendBack(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = revisionNote.trim();
    if (trimmed.length < 10) {
      toast.error("Please provide a reason of at least 10 characters");
      return;
    }
    void submit("needs_revision", { revisionNote: trimmed });
  }

  return (
    <>
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold">Review this expense</p>
        <div className="space-y-2">
          <Label htmlFor="review-comment">Comment</Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Required for reject"
            className="resize-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading !== null}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
            onClick={() => submit("approved")}
          >
            {loading === "approved" ? "Saving…" : "Approve"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={loading !== null}
            onClick={() => submit("rejected")}
          >
            {loading === "rejected" ? "Saving…" : "Reject"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={loading !== null}
            onClick={() => setRevisionOpen(true)}
          >
            {loading === "needs_revision" ? "Saving…" : "Send back for revision"}
          </Button>
        </div>
      </div>

      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent>
          <form onSubmit={handleSendBack}>
            <DialogHeader>
              <DialogTitle>Send back for revision</DialogTitle>
              <DialogDescription>
                Tell the submitter what they need to change before resubmitting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="revision-note">Reason for revision (required)</Label>
              <Textarea
                id="revision-note"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={4}
                required
                minLength={10}
                placeholder="e.g. Please attach the original receipt — a photo is fine"
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRevisionOpen(false)}
                disabled={loading !== null}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading !== null}>
                {loading === "needs_revision" ? "Sending…" : "Send back"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
