"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Connection = {
  tenantName: string;
  createdAt: string;
};

export function XeroIntegrationPanel({
  slug,
  connection,
}: {
  slug: string;
  connection: Connection | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [connected, setConnected] = useState(connection);

  useEffect(() => {
    setConnected(connection);
  }, [connection]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (searchParams.get("connected") === "1") {
      toast.success("Xero connected successfully");
      router.replace(`/org/${slug}/settings/integrations`);
      router.refresh();
    } else if (error) {
      toast.error("Could not connect to Xero. Please try again.");
      router.replace(`/org/${slug}/settings/integrations`);
    }
  }, [searchParams, slug, router]);

  function onDisconnect() {
    startTransition(async () => {
      const res = await fetch(
        `/api/integrations/xero/disconnect?slug=${encodeURIComponent(slug)}`,
        { method: "POST" }
      );
      if (!res.ok) {
        toast.error("Failed to disconnect Xero");
        return;
      }
      setConnected(null);
      toast.success("Xero disconnected");
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-[#1E3A8A]">Xero</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Push approved expenses to Xero as spend money transactions
        </p>
      </div>

      <div className="px-6 py-5">
        {connected ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-sm font-medium text-slate-800">{connected.tenantName}</p>
              <p className="mt-1 text-xs text-slate-500">
                Connected {format(new Date(connected.createdAt), "d MMM yyyy")}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onDisconnect} disabled={pending}>
              {pending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        ) : (
          <Link
            href={`/api/integrations/xero/connect?slug=${encodeURIComponent(slug)}`}
            className={cn(buttonVariants())}
          >
            Connect to Xero
          </Link>
        )}
      </div>
    </div>
  );
}
