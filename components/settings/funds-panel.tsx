"use client";

import { useState } from "react";
import type { Fund } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function FundsPanel({ slug, initialFunds }: { slug: string; initialFunds: Fund[] }) {
  const [funds, setFunds] = useState(initialFunds);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    [ORG_SLUG_HEADER]: slug,
  };

  const active = funds.filter((f) => !f.archived);
  const archived = funds.filter((f) => f.archived);

  async function addFund(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not add fund");
        return;
      }
      toast.success("Fund added");
      setName("");
      setFunds((prev) => [...prev, data]);
    } finally {
      setLoading(false);
    }
  }

  async function archiveFund(id: string) {
    const res = await fetch("/api/funds", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, archived: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not archive fund");
      return;
    }
    setFunds((prev) => prev.map((f) => (f.id === id ? { ...f, archived: true } : f)));
    toast.success("Fund archived");
  }

  return (
    <div className="space-y-8">
      <form className="flex max-w-md flex-wrap items-end gap-3" onSubmit={addFund}>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="new-fund">Add fund</Label>
          <Input
            id="new-fund"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Building appeal"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          Add
        </Button>
      </form>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  No active funds yet.
                </TableCell>
              </TableRow>
            ) : (
              active.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => archiveFund(f.id)}
                    >
                      Archive
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {archived.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowArchived((v) => !v)}
          >
            Archived ({archived.length}) {showArchived ? "▾" : "▸"}
          </button>
          {showArchived && (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archived.map((f) => (
                    <TableRow key={f.id} className="text-muted-foreground">
                      <TableCell>{f.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
