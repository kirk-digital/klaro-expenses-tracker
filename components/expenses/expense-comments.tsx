"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ORG_SLUG_HEADER } from "@/lib/constants";

type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: { name: string };
};

export function ExpenseComments({
  expenseId,
  slug,
  initialComments,
}: {
  expenseId: string;
  slug: string;
  initialComments: Comment[];
  currentUserName: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/expenses/${expenseId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ORG_SLUG_HEADER]: slug,
      },
      credentials: "include",
      body: JSON.stringify({ body }),
    });

    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setBody("");
    }
    setSubmitting(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <h2 className="mb-1 text-sm font-semibold text-slate-700">Comments</h2>
      <p className="mb-4 text-xs text-slate-400">Discussion on this expense</p>

      <div className="mb-4 space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-slate-400">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-semibold text-white">
              {c.author.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {c.author.name}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-snug text-slate-600">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A8A]/90 disabled:opacity-40"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </form>
    </div>
  );
}
