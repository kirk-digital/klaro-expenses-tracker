"use client";

import { Receipt, Car } from "lucide-react";

type ExpenseType = "receipted" | "mileage";

const options: {
  value: ExpenseType;
  icon: React.ElementType;
  title: string;
  description: string;
}[] = [
  {
    value: "receipted",
    icon: Receipt,
    title: "Receipted expense",
    description: "Any purchase with a receipt — materials, subscriptions, tools",
  },
  {
    value: "mileage",
    icon: Car,
    title: "Mileage",
    description: "Business travel — HMRC AMAP rates calculated automatically",
  },
];

export function ExpenseTypeSelector({
  value,
  onChange,
}: {
  value: ExpenseType;
  onChange: (v: ExpenseType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const selected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col gap-3 rounded-xl border-[1.5px] p-4 text-left transition-all duration-150 ${
              selected
                ? "border-[#1E3A8A] bg-blue-50"
                : "border-slate-200 bg-white hover:border-cyan-400"
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  selected ? "bg-[#1E3A8A]/10" : "bg-slate-100"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    selected ? "text-[#1E3A8A]" : "text-slate-400"
                  }`}
                />
              </div>
              <span
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                  selected
                    ? "border-[#1E3A8A] bg-[#1E3A8A]"
                    : "border-slate-300"
                }`}
              >
                {selected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-50" />
                )}
              </span>
            </div>

            <div>
              <p
                className={`text-sm font-medium ${
                  selected ? "text-[#0F2057]" : "text-slate-700"
                }`}
              >
                {opt.title}
              </p>
              <p
                className={`mt-0.5 text-xs leading-relaxed ${
                  selected ? "text-blue-500" : "text-slate-400"
                }`}
              >
                {opt.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
