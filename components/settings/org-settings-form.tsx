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
}: {
  slug: string;
  initialName: string;
  orgType: string;
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
