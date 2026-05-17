"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { ORG_SLUG_HEADER } from "@/lib/constants";

type Notification = {
  id: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
};

function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationsList({
  slug,
  initialNotifications,
}: {
  slug: string;
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const headers = {
    [ORG_SLUG_HEADER]: slug,
  };

  async function markOneRead(id: string) {
    const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      credentials: "include",
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  }

  async function dismiss(id: string) {
    const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    if (res.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }

  return (
    <div className="divide-y divide-slate-50">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
            !n.read
              ? "border-l-2 border-l-cyan-400 bg-cyan-50/40"
              : "border-l-2 border-l-transparent"
          }`}
        >
          <Bell
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              n.read ? "text-slate-300" : "text-cyan-400"
            }`}
          />

          <div className="min-w-0 flex-1">
            <p
              className={`text-sm leading-snug ${
                n.read ? "text-slate-400" : "font-medium text-slate-700"
              }`}
            >
              {n.message}
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              {formatRelativeTime(n.createdAt)}
            </p>
          </div>

          <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
            {!n.read && (
              <button
                type="button"
                onClick={() => markOneRead(n.id)}
                className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
              >
                Mark read
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              title="Dismiss"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-300 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-400"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      ))}

      {notifications.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          No notifications yet
        </p>
      )}
    </div>
  );
}
