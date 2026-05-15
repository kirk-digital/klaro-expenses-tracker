import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canManageOrg } from "@/lib/role-helpers";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";

type Props = { params: { slug: string } };

export default async function OrgSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  if (!canManageOrg(access.role)) {
    redirect(`/org/${params.slug}/dashboard`);
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organization.id },
  });

  if (!org) redirect("/sign-in");

  return (
    <OrgSettingsForm slug={params.slug} initialName={org.name} orgType={org.type} />
  );
}
