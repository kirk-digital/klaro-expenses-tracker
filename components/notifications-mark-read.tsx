"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function NotificationsMarkRead({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          [ORG_SLUG_HEADER]: slug,
        },
        credentials: "include",
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) {
        toast.error("Could not update notifications");
        return;
      }
      toast.success("Marked all as read");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={markAll} disabled={loading}>
      {loading ? "Updating…" : "Mark all read"}
    </Button>
  );
}
