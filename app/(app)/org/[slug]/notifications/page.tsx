import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { NotificationsMarkRead } from "@/components/notifications-mark-read";

type Props = { params: { slug: string } };

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function NotificationsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      organizationId: access.organization.id,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#1E3A8A]">
          <Bell className="h-6 w-6" />
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Updates about your expenses and organisation
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1E3A8A]">Recent</h2>
          <NotificationsMarkRead
            slug={params.slug}
            className="text-xs font-medium text-cyan-500 transition-colors hover:text-cyan-600"
          />
        </div>

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
                <p className={`text-sm ${n.read ? "text-slate-400" : "text-slate-700"}`}>
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatRelativeTime(n.createdAt)}
                </p>
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
    </div>
  );
}
