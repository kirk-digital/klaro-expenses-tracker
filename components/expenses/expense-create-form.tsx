"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Category } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);

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
    <form
      className="space-y-4 rounded-xl border bg-card p-8 shadow-sm"
      onSubmit={onSubmit}
    >
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
        <Input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
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
        <input
          ref={fileInputRef}
          id="receipt"
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors",
            "bg-muted/30 text-muted-foreground hover:bg-muted/60"
          )}
        >
          <span className="text-sm font-medium text-foreground">
            Click to upload or drag and drop
          </span>
          <span className="mt-1 text-xs">
            {fileName ?? "JPEG, PNG, or PDF · max 10MB"}
          </span>
        </button>
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading || categories.length === 0}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit expense"
        )}
      </Button>
    </form>
  );
}
