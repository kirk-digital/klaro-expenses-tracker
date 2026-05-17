"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2, Receipt } from "lucide-react";
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
import type { ExpenseForEdit } from "./expense-edit-shell";

function formatDateInput(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function ExpenseCreateForm({
  slug,
  categories,
  orgType,
  funds = [],
  editMode = false,
  expense,
}: {
  slug: string;
  categories: { id: string; name: string }[];
  orgType: string;
  funds?: { id: string; name: string }[];
  editMode?: boolean;
  expense?: ExpenseForEdit;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(
    editMode && expense?.categoryId
      ? expense.categoryId
      : (categories[0]?.id ?? "")
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fundType, setFundType] = useState(expense?.fundType ?? "unrestricted");
  const [fundId, setFundId] = useState(expense?.fundId ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (categoryId) {
      fd.set("categoryId", categoryId);
    }
    if (orgType === "charity") {
      fd.set("fundType", fundType);
      if (fundType === "restricted" && fundId) {
        fd.set("fundId", fundId);
      }
    }
    if (editMode && expense) {
      fd.set("action", "resubmit");
    }
    setLoading(true);
    try {
      const url = editMode && expense ? `/api/expenses/${expense.id}` : "/api/expenses";
      const method = editMode ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { [ORG_SLUG_HEADER]: slug },
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || (editMode ? "Could not resubmit expense" : "Could not create expense"));
        return;
      }
      toast.success(editMode ? "Expense resubmitted" : "Expense submitted");
      router.push(`/org/${slug}/expenses/${editMode && expense ? expense.id : data.id}`);
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
          <Input
            id="merchant"
            name="merchant"
            required
            defaultValue={editMode && expense ? expense.merchant : undefined}
          />
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
              defaultValue={
                editMode && expense ? Number(expense.amount).toFixed(2) : undefined
              }
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
            defaultValue={
              editMode && expense
                ? formatDateInput(expense.date)
                : new Date().toISOString().slice(0, 10)
            }
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

        {orgType === "charity" && (
          <>
            <div className="space-y-2">
              <Label>Fund type</Label>
              <Select value={fundType} onValueChange={(v) => v && setFundType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unrestricted">Unrestricted</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fundType === "restricted" && (
              <div className="space-y-2">
                <Label>Fund name</Label>
                <Select value={fundId} onValueChange={(v) => v && setFundId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={editMode && expense?.notes ? expense.notes : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receipt-input">Receipt</Label>
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              "hover:border-primary/50 hover:bg-muted/30",
              receiptFile ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {receiptFile ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">{receiptFile.name}</p>
                <p className="text-xs text-muted-foreground">Tap to change</p>
              </>
            ) : editMode && expense?.receipts[0] ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">
                  {expense.receipts[0].filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  Current receipt · tap to replace
                </p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  {editMode ? "Upload a new receipt (optional)" : "Take photo or upload receipt"}
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG or PDF · max 10 MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              id="receipt-input"
              name="receipt"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              required={!editMode}
              className="sr-only"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
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
              {editMode ? "Resubmitting…" : "Submitting…"}
            </>
          ) : editMode ? (
            "Resubmit expense"
          ) : (
            "Submit expense"
          )}
        </Button>
      </form>
    </Card>
  );
}
