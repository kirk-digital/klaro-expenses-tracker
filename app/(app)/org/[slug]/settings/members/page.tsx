import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canManageMembers } from "@/lib/role-helpers";
import { MembersPanel } from "@/components/settings/members-panel";

type Props = { params: { slug: string } };

export default async function MembersSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  if (!canManageMembers(access.role)) {
    redirect(`/org/${params.slug}/dashboard`);
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: access.organization.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const rows = members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }));

  return (
    <MembersPanel
      slug={params.slug}
      currentUserId={session.user.id}
      initialMembers={rows}
    />
  );
}
