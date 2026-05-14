"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOrganizationAction } from "@/lib/actions/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrgSettingsForm({
  slug,
  initialName,
  initialCurrency,
}: {
  slug: string;
  initialName: string;
  initialCurrency: string;
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
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Organisation</CardTitle>
        <CardDescription>Display name and default currency for new expenses</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={initialName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency (ISO code)</Label>
            <Input
              id="currency"
              name="currency"
              required
              minLength={3}
              maxLength={3}
              defaultValue={initialCurrency}
              className="uppercase"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
