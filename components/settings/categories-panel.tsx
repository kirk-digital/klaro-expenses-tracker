"use client";

import { useMemo, useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="space-y-8">
      <form className="flex max-w-md flex-wrap items-end gap-3" onSubmit={addCategory}>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="new-cat">New category</Label>
          <Input
            id="new-cat"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Training"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          Add
        </Button>
      </form>

      <div className="space-y-1">
        {activeCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active categories.</p>
        ) : (
          activeCategories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
            >
              <p className="text-sm font-medium">{c.name}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => toggleArchived(c.id, true)}
              >
                Archive
              </Button>
            </div>
          ))
        )}
      </div>

      {archivedCategories.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Archived
          </p>
          <div className="space-y-1">
            {archivedCategories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
              >
                <p className="text-sm text-muted-foreground line-through">{c.name}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleArchived(c.id, false)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
