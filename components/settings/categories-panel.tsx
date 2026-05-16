"use client";

import { useMemo, useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";

export function CategoriesPanel({
  slug,
  initialCategories,
}: {
  slug: string;
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.archived),
    [categories]
  );
  const archivedCategories = useMemo(
    () => categories.filter((c) => c.archived),
    [categories]
  );

  const headers = {
    "Content-Type": "application/json",
    [ORG_SLUG_HEADER]: slug,
  };

  function refresh() {
    startTransition(async () => {
      const res = await fetch("/api/categories", { headers: { [ORG_SLUG_HEADER]: slug } });
      if (res.ok) {
        setCategories(await res.json());
      }
    });
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not add category");
      return;
    }
    toast.success("Category added");
    setName("");
    refresh();
  }

  async function toggleArchived(id: string, archived: boolean) {
    const res = await fetch("/api/categories", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, archived }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not update category");
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1E3A8A]">Categories</h2>
          <form onSubmit={addCategory} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New category…"
              className="h-7 w-36 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
            <button
              type="submit"
              disabled={!name.trim() || pending}
              className="flex h-7 items-center gap-1 rounded-lg bg-[#1E3A8A] px-3 text-xs font-medium text-white disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-50">
          {activeCategories.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">No active categories.</p>
          ) : (
            activeCategories.map((c, i) => (
              <div key={c.id} className="group flex items-center justify-between px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      i % 2 === 0 ? "bg-cyan-400" : "bg-[#1E3A8A]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{c.name}</p>
                    {c.hmrcCategory && (
                      <p className="truncate text-[11px] text-slate-400">
                        HMRC: {c.hmrcCategory}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleArchived(c.id, true)}
                  className="ml-4 shrink-0 text-xs text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:!text-red-400"
                >
                  Archive
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {archivedCategories.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-5 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
              Archived
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {archivedCategories.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-slate-400 line-through">{c.name}</p>
                <button
                  type="button"
                  onClick={() => toggleArchived(c.id, false)}
                  className="ml-4 shrink-0 text-xs text-slate-400 transition-colors hover:text-[#1E3A8A]"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
