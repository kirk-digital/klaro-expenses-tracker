"use client";

import { useState } from "react";
import { ExpenseTypeSelector } from "./expense-type-selector";
import { ExpenseCreateForm } from "./expense-create-form";
import { MileageCreateForm } from "./mileage-create-form";

type ExpenseType = "receipted" | "mileage";

export function ExpenseNewShell({
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
      <ExpenseTypeSelector value={type} onChange={setType} />

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
