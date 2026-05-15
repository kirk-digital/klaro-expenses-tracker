import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canManageMembers } from "@/lib/role-helpers";
import { FundsPanel } from "@/components/settings/funds-panel";

type Props = { params: { slug: string } };

export default async function FundsSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  if (access.organization.type !== "charity") {
    redirect(`/org/${params.slug}/settings`);
  }

  if (!canManageMembers(access.role)) {
    redirect(`/org/${params.slug}/dashboard`);
  }

  const funds = await prisma.fund.findMany({
    where: { organizationId: access.organization.id },
    orderBy: { name: "asc" },
  });

  return <FundsPanel slug={params.slug} initialFunds={funds} />;
}
