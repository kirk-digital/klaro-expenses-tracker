"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExpenseCreateForm({
  slug,
  currency,
  categories,
}: {
  slug: string;
  currency: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (categoryId) {
      fd.set("categoryId", categoryId);
    }
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { [ORG_SLUG_HEADER]: slug },
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not create expense");
        return;
      }
      toast.success("Expense submitted");
      router.push(`/org/${slug}/expenses/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4 rounded-lg border bg-card p-6" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="merchant">Merchant</Label>
        <Input id="merchant" name="merchant" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Input readOnly value={currency} className="bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={categoryId}
          onValueChange={(v) => setCategoryId(v ?? "")}
          disabled={categories.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt">Receipt</Label>
        <Input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" required />
        <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF · max 10MB</p>
      </div>
      <Button type="submit" disabled={loading || categories.length === 0}>
        {loading ? "Submitting…" : "Submit expense"}
      </Button>
    </form>
  );
}
