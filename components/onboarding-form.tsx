"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrgType } from "@prisma/client";
import { slugify } from "@/lib/slug";
import { createOrganizationAction } from "@/lib/actions/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [orgType, setOrgType] = useState<OrgType>("business");

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("type", orgType);
    startTransition(async () => {
      const res = await createOrganizationAction(null, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.slug) {
        router.push(`/org/${res.slug}/dashboard`);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your organisation</CardTitle>
        <CardDescription>
          You will be the owner. You can invite teammates after setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Organisation name</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="acme-inc"
              required
            />
            <p className="text-xs text-muted-foreground">
              Your workspace URL will be <span className="font-mono">/org/{slug || "…"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label>Organisation type</Label>
            <Select
              value={orgType}
              onValueChange={(v) => v && setOrgType(v as OrgType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sole_trader">Sole trader</SelectItem>
                <SelectItem value="business">Business / limited company</SelectItem>
                <SelectItem value="charity">Charity / nonprofit</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This sets your default expense categories. You can change it later in Settings.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
