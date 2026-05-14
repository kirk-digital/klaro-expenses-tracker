"use client";

import { useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CategoriesPanel({ slug, initialCategories }: { slug: string; initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-40">Archived</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id} className={c.archived ? "text-muted-foreground" : ""}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={c.archived}
                      onCheckedChange={(v) => toggleArchived(c.id, Boolean(v))}
                      id={`arch-${c.id}`}
                    />
                    <Label htmlFor={`arch-${c.id}`} className="text-sm font-normal">
                      Archived
                    </Label>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
