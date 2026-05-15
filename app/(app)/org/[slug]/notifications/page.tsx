import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationsMarkRead } from "@/components/notifications-mark-read";

type Props = { params: { slug: string } };

export default async function NotificationsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  const items = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      organizationId: access.organization.id,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground">Updates about your expenses and organisation</p>
        </div>
        <NotificationsMarkRead slug={params.slug} />
      </div>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>Latest messages for you in this organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">No notifications yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;ll see updates about expenses and approvals here.
                </p>
              </div>
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-card px-4 py-3",
                  !n.read && "border-l-4 border-l-primary"
                )}
              >
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </p>
                  <p className={cn("text-sm", n.read && "text-muted-foreground")}>{n.message}</p>
                </div>
              </div>
            ))
          )}
          <p className="text-sm">
            <Link href={`/org/${params.slug}/dashboard`} className="text-primary hover:underline">
              Back to dashboard
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
