"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Category } from "@prisma/client";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  categories,
}: {
  slug: string;
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
    <Card className="rounded-xl p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="merchant">Merchant</Label>
          <Input id="merchant" name="merchant" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              £
            </span>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="pl-7"
            />
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
          <Label htmlFor="receipt-input">Receipt</Label>
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30",
              fileName ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            {fileName ? (
              <p className="text-sm font-medium text-primary">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Click to upload receipt</p>
                <p className="text-xs text-muted-foreground">PNG, JPG or PDF · max 10 MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              id="receipt-input"
              name="receipt"
              type="file"
              accept="image/*,application/pdf"
              required
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </div>
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
    </Card>
  );
}
