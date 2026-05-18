"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NotificationPoller() {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onmessage = (event) => {
      if (event.data === "ping") {
        // New notification arrived — refresh server components
        router.refresh();
      }
    };

    es.onerror = () => {
      // Connection dropped — EventSource auto-reconnects after ~3s
      // No action needed
    };

    return () => {
      es.close();
    };
  }, [router]);

  return null;
}
