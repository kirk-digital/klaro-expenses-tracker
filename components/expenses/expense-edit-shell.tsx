"use client";

import { ExpenseCreateForm } from "./expense-create-form";
import { MileageCreateForm } from "./mileage-create-form";

export type ExpenseForEdit = {
  id: string;
  expenseType: "receipted" | "mileage";
  merchant: string;
  amount: { toString(): string } | string | number;
  date: Date | string;
  categoryId: string | null;
  notes: string | null;
  miles: { toString(): string } | string | number | null;
  amapRate: { toString(): string } | string | number | null;
  fundType: string | null;
  fundId: string | null;
  receipts: { filename: string }[];
};

export function ExpenseEditShell({
  slug,
  categories,
  milesThisYear,
  orgType,
  funds = [],
  expense,
}: {
  slug: string;
  categories: { id: string; name: string }[];
  milesThisYear: number;
  orgType: string;
  funds?: { id: string; name: string }[];
  expense: ExpenseForEdit;
}) {
  if (expense.expenseType === "mileage") {
    return (
      <MileageCreateForm
        slug={slug}
        milesThisYear={milesThisYear}
        editMode
        expense={expense}
      />
    );
  }

  return (
    <ExpenseCreateForm
      slug={slug}
      categories={categories}
      orgType={orgType}
      funds={funds}
      editMode
      expense={expense}
    />
  );
}
