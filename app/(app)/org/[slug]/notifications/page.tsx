import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { NotificationsMarkRead } from "@/components/notifications-mark-read";
import { NotificationsList } from "@/components/notifications-list";

type Props = { params: { slug: string } };

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
    select: {
      id: true,
      message: true,
      read: true,
      createdAt: true,
      expenseId: true,
    },
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

        <NotificationsList slug={params.slug} initialNotifications={notifications} />
      </div>
    </div>
  );
}
