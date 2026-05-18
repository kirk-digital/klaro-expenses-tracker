"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOrganizationAction } from "@/lib/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrgSettingsForm({
  slug,
  initialName,
  orgType,
  requiresApproval,
}: {
  slug: string;
  initialName: string;
  orgType: string;
  requiresApproval: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await updateOrganizationAction(slug, null, fd);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Organisation updated");
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-[#1E3A8A]">Organisation</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Display name and type for your organisation
        </p>
      </div>

      <form className="space-y-5 px-6 py-5" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-medium text-slate-600">
            Name
          </label>
          <Input id="name" name="name" required defaultValue={initialName} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Organisation type</label>
          <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
            {orgType === "sole_trader" && "Sole trader"}
            {orgType === "business" && "Business / limited company"}
            {orgType === "charity" && "Charity / nonprofit"}
          </div>
          <p className="text-[11px] text-slate-400">
            Contact support to change your organisation type.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Expense approvals
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            When enabled, expenses must be approved before they are considered
            complete. Disable for sole traders or orgs without a separate approver.
          </p>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Require approval for all expenses
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                If disabled, expenses are automatically approved on submission.
              </p>
            </div>
            <input
              type="checkbox"
              name="requiresApproval"
              defaultChecked={requiresApproval}
              className="h-4 w-4 accent-cyan-500"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
