"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string };
type Submitter = { id: string; name: string };

const filterWrap = "min-w-0 w-full space-y-1.5 sm:w-auto";
const selectTrigger =
  "h-11 min-h-[44px] w-full bg-white text-slate-700 sm:h-8 sm:min-h-0 sm:w-auto";
const dateInput =
  "appearance-none h-11 min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent sm:h-8 sm:min-h-0 sm:w-auto";

export function ExpenseFilters({
  categories,
  submitters,
  showSubmitterFilter,
}: {
  categories: Category[];
  submitters: Submitter[];
  showSubmitterFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  const hasFilters = ["status", "categoryId", "from", "to", "submittedById"].some(
    (k) => searchParams.has(k)
  );

  return (
    <div className="flex flex-wrap gap-2 overflow-hidden rounded-xl border bg-card p-4">
      <div className={filterWrap}>
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(v) => setParam("status", v)}
        >
          <SelectTrigger className={selectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="needs_revision">Needs revision</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={filterWrap}>
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select
          value={searchParams.get("categoryId") ?? "all"}
          onValueChange={(v) => setParam("categoryId", v)}
        >
          <SelectTrigger className={selectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={filterWrap}>
        <Label className="text-xs text-muted-foreground">From</Label>
        <input
          type="date"
          className={dateInput}
          value={searchParams.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </div>
      <div className={filterWrap}>
        <Label className="text-xs text-muted-foreground">To</Label>
        <input
          type="date"
          className={dateInput}
          value={searchParams.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </div>

      {showSubmitterFilter && (
        <div className={filterWrap}>
          <Label className="text-xs text-muted-foreground">Submitted by</Label>
          <Select
            value={searchParams.get("submittedById") ?? "all"}
            onValueChange={(v) => setParam("submittedById", v)}
          >
            <SelectTrigger className={selectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {submitters.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] w-full sm:h-8 sm:min-h-0 sm:w-auto"
          onClick={clearAll}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
