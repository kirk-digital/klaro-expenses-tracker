"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { ORG_SLUG_HEADER } from "@/lib/constants";

type NotificationRow = {
  id: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
  expenseId: string | null;
};

function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationsList({
  slug,
  initialNotifications,
}: {
  slug: string;
  initialNotifications: NotificationRow[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);

  const headers = {
    "Content-Type": "application/json",
    [ORG_SLUG_HEADER]: slug,
  };

  async function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      credentials: "include",
    });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  async function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
  }

  function handleRowClick(n: NotificationRow) {
    if (!n.read) markOneRead(n.id);
    if (n.expenseId) router.push(`/org/${slug}/expenses/${n.expenseId}`);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[#1E3A8A]">Recent</h2>
        <button
          type="button"
          onClick={markAllRead}
          className="text-xs font-medium text-cyan-500 transition-colors hover:text-cyan-600"
        >
          Mark all read
        </button>
      </div>

      <div className="divide-y divide-slate-50">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => handleRowClick(n)}
            className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
              n.expenseId ? "cursor-pointer" : "cursor-default"
            } ${
              !n.read
                ? "border-l-2 border-l-cyan-400 bg-cyan-50/40 hover:bg-cyan-50/70"
                : "border-l-2 border-l-transparent hover:bg-slate-50"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    markOneRead(n.id);
                  }}
                  className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n.id);
                }}
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
    </div>
  );
}
