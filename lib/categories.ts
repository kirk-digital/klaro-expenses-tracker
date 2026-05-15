import type { OrgType } from "@prisma/client";

type DefaultCategory = { name: string; hmrcCategory: string };

const baseCategories: DefaultCategory[] = [
  { name: "Office and equipment", hmrcCategory: "Office, property and equipment" },
  { name: "Car and travel", hmrcCategory: "Car, van and travel expenses" },
  { name: "Clothing", hmrcCategory: "Clothing expenses" },
  { name: "Staff costs", hmrcCategory: "Staff expenses" },
  { name: "Materials and stock", hmrcCategory: "Reselling goods" },
  { name: "Legal and financial", hmrcCategory: "Legal and financial costs" },
  {
    name: "Marketing and subscriptions",
    hmrcCategory: "Marketing, entertainment and subscriptions",
  },
  { name: "Training", hmrcCategory: "Training courses" },
  { name: "Premises costs", hmrcCategory: "Premises costs (business property)" },
  { name: "Other allowable expenses", hmrcCategory: "Other allowable business expenses" },
];

const charityExtras: DefaultCategory[] = [
  { name: "Volunteer expenses", hmrcCategory: "Staff expenses" },
  { name: "Fundraising costs", hmrcCategory: "Marketing, entertainment and subscriptions" },
  { name: "Grant-funded activity", hmrcCategory: "Other allowable business expenses" },
];

export function getDefaultCategories(orgType: OrgType): DefaultCategory[] {
  if (orgType === "charity") return [...baseCategories, ...charityExtras];
  return baseCategories;
}
