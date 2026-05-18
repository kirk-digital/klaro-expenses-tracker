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

const formSelectTriggerClassName = "bg-white text-slate-700";

const nativeSelectClassName =
  "w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400";

export function ExpenseCreateForm({
  slug,
  categories,
  orgType,
  funds = [],
  editMode = false,
  expense,
  currentStatus,
}: {
  slug: string;
  categories: { id: string; name: string }[];
  orgType: string;
  funds?: { id: string; name: string }[];
  editMode?: boolean;
  expense?: ExpenseForEdit;
  currentStatus?: string;
}) {
  const isResubmit = editMode && currentStatus === "needs_revision";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(
    editMode && expense?.categoryId
      ? expense.categoryId
      : (categories[0]?.id ?? "")
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fundType, setFundType] = useState(expense?.fundType ?? "unrestricted");
  const [fundId, setFundId] = useState(expense?.fundId ?? "");

  const todayDefault = formatDateInput(new Date());
  const [merchant, setMerchant] = useState(
    editMode && expense ? expense.merchant : ""
  );
  const [amount, setAmount] = useState(
    editMode && expense ? Number(expense.amount).toFixed(2) : ""
  );
  const [date, setDate] = useState(
    editMode && expense ? formatDateInput(expense.date) : todayDefault
  );
  const [vatRate, setVatRate] = useState(
    editMode && expense?.vatRate ? expense.vatRate : ""
  );

  async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setScanned(false);
    setScanError(null);

    setScanning(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (res.status === 503) {
        setScanError("Receipt scanning is not configured on this server — please fill in the fields manually.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        // Log the detail for debugging but don't expose raw API errors to users
        if (errData.detail) console.warn("[ocr]", errData.detail);
        setScanError("Receipt scanning is unavailable right now — please fill in the fields manually.");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        let filled = false;

        if (data.merchant) {
          setMerchant(data.merchant);
          filled = true;
        }
        if (data.total != null) {
          setAmount(String(data.total));
          filled = true;
        }
        if (data.date) {
          setDate(data.date);
          filled = true;
        }
        if (data.vatRate != null && data.vatRate !== "") {
          setVatRate(String(data.vatRate));
          filled = true;
        }

        if (filled) setScanned(true);
      }
    } catch {
      setScanError("Could not read receipt — please fill in the fields manually.");
    } finally {
      setScanning(false);
    }
  }

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
    if (isResubmit && expense) {
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
        toast.error(
          data.error ||
            (isResubmit
              ? "Could not resubmit expense"
              : editMode
                ? "Could not save changes"
                : "Could not create expense")
        );
        return;
      }
      toast.success(
        isResubmit ? "Expense resubmitted" : editMode ? "Changes saved" : "Expense submitted"
      );
      router.push(`/org/${slug}/expenses/${editMode && expense ? expense.id : data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="merchant">Merchant</Label>
          <Input
            id="merchant"
            name="merchant"
            required
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v ?? "")}
            disabled={categories.length === 0}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
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
                <SelectTrigger className={formSelectTriggerClassName}>
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
                  <SelectTrigger className={formSelectTriggerClassName}>
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
          <Label htmlFor="vatRate">VAT rate</Label>
          <div className="relative mt-1">
            <select
              id="vatRate"
              name="vatRate"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className={nativeSelectClassName}
            >
              <option value="">No VAT / Unknown</option>
              <option value="20">20% — Standard rate</option>
              <option value="5">5% — Reduced rate</option>
              <option value="0">0% — Zero rated</option>
              <option value="exempt">Exempt</option>
              <option value="outside_scope">Outside scope</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Select the VAT rate shown on the receipt. Leave blank if unsure.
          </p>
        </div>

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
              onChange={handleReceiptChange}
            />
          </div>
          {scanning && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-cyan-500">
              <span className="inline-block animate-spin">⟳</span>
              Reading receipt…
            </p>
          )}
          {scanned && !scanning && (
            <p className="mt-2 text-xs text-slate-400">
              ✓ Fields pre-filled from receipt — check and correct if needed.
            </p>
          )}
          {scanError && <p className="mt-2 text-xs text-amber-600">{scanError}</p>}
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
              {isResubmit ? "Resubmitting…" : editMode ? "Saving…" : "Submitting…"}
            </>
          ) : isResubmit ? (
            "Resubmit expense"
          ) : editMode ? (
            "Save changes"
          ) : (
            "Submit expense"
          )}
        </Button>
      </form>
    </Card>
  );
}
