"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExpenseForEdit } from "./expense-edit-shell";

function formatDateInput(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

const AMAP_HIGH = 0.45;
const AMAP_LOW = 0.25;

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(2, "Describe the journey purpose"),
  miles: z.string().refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n > 0;
  }, "Enter a valid number of miles"),
});

type Form = z.infer<typeof schema>;

export function MileageCreateForm({
  slug,
  milesThisYear = 0,
  editMode = false,
  expense,
  currentStatus,
}: {
  slug: string;
  milesThisYear?: number;
  editMode?: boolean;
  expense?: ExpenseForEdit;
  currentStatus?: string;
}) {
  const isResubmit = editMode && currentStatus === "needs_revision";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      date:
        editMode && expense
          ? formatDateInput(expense.date)
          : new Date().toISOString().split("T")[0],
      description: editMode && expense ? expense.merchant : "",
      miles: editMode && expense?.miles != null ? String(expense.miles) : "",
    },
  });

  const watchedMiles = Number(form.watch("miles")) || 0;

  function calculateAmount(newMiles: number): number {
    const remaining = Math.max(0, 10000 - milesThisYear);
    const highMiles = Math.min(newMiles, remaining);
    const lowMiles = Math.max(0, newMiles - remaining);
    return highMiles * AMAP_HIGH + lowMiles * AMAP_LOW;
  }

  const previewAmount = calculateAmount(watchedMiles);
  const amapRate = milesThisYear < 10000 ? AMAP_HIGH : AMAP_LOW;

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      const miles = Number(values.miles);
      const amount = calculateAmount(miles);

      const payload = {
        ...(isResubmit ? { action: "resubmit" as const } : {}),
        expenseType: "mileage",
        date: values.date,
        merchant: values.description,
        notes: values.description,
        miles,
        amapRate,
        amount: amount.toFixed(2),
        categoryName: "Car and travel",
      };

      const url = editMode && expense ? `/api/expenses/${expense.id}` : "/api/expenses";
      const method = editMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          [ORG_SLUG_HEADER]: slug,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          data.error ||
            (isResubmit
              ? "Could not resubmit mileage expense"
              : editMode
                ? "Could not save changes"
                : "Could not submit mileage expense")
        );
        return;
      }
      toast.success(
        isResubmit
          ? "Mileage expense resubmitted"
          : editMode
            ? "Changes saved"
            : "Mileage expense submitted"
      );
      router.push(
        editMode && expense ? `/org/${slug}/expenses/${expense.id}` : `/org/${slug}/expenses`
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Log mileage</CardTitle>
        <CardDescription>
          HMRC rate: {milesThisYear < 10000 ? "45p" : "25p"}/mile
          {milesThisYear < 10000 && (
            <span className="ml-1 text-muted-foreground">
              · {(10000 - milesThisYear).toLocaleString()} miles remaining at 45p
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            ["date", "description", "miles"].forEach((key) => {
              const val = fd.get(key);
              if (typeof val === "string") {
                form.setValue(key as keyof Form, val, { shouldDirty: true });
              }
            });
            form.handleSubmit(onSubmit)();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...form.register("date")} />
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Journey purpose</Label>
            <Input
              id="description"
              placeholder="e.g. Site visit — 12 High Street, Bristol"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="miles">Miles driven</Label>
            <Input
              id="miles"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              placeholder="0"
              {...form.register("miles")}
            />
            {form.formState.errors.miles && (
              <p className="text-sm text-destructive">{form.formState.errors.miles.message}</p>
            )}
          </div>

          {watchedMiles > 0 && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claimable amount</span>
                <span className="font-semibold">£{previewAmount.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {watchedMiles} miles × {amapRate * 100}p/mile (HMRC AMAP rate)
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? isResubmit
                ? "Resubmitting…"
                : editMode
                  ? "Saving…"
                  : "Submitting…"
              : isResubmit
                ? "Resubmit expense"
                : editMode
                  ? "Save changes"
                  : "Submit mileage"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
