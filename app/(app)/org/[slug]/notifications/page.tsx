import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Updates about your expenses and organisation</p>
        </div>
        <NotificationsMarkRead slug={params.slug} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>Latest messages for you in this organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={n.read ? "text-muted-foreground" : "border-l-2 border-primary pl-3"}
              >
                <p className="text-xs">{format(n.createdAt, "MMM d, yyyy HH:mm")}</p>
                <p className="text-sm">{n.message}</p>
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
