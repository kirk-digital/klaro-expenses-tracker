"use client";

import { useState } from "react";
import { Receipt, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpenseCreateForm } from "./expense-create-form";
import { MileageCreateForm } from "./mileage-create-form";

type ExpenseType = "receipted" | "mileage";

export function ExpenseTypeSelector({
  slug,
  categories,
  milesThisYear,
  orgType,
  funds = [],
}: {
  slug: string;
  categories: { id: string; name: string }[];
  milesThisYear: number;
  orgType: string;
  funds?: { id: string; name: string }[];
}) {
  const [type, setType] = useState<ExpenseType>("receipted");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-xl border bg-muted/30 p-1">
        {[
          { value: "receipted" as const, label: "Receipted expense", icon: Receipt },
          { value: "mileage" as const, label: "Mileage", icon: Car },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              type === value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {type === "receipted" ? (
        <ExpenseCreateForm
          slug={slug}
          categories={categories}
          orgType={orgType}
          funds={funds}
        />
      ) : (
        <MileageCreateForm slug={slug} milesThisYear={milesThisYear} />
      )}
    </div>
  );
}
