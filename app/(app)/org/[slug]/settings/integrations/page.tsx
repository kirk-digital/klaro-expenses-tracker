import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canManageOrg } from "@/lib/role-helpers";
import { XeroIntegrationPanel } from "@/components/settings/xero-integration-panel";

type Props = { params: { slug: string } };

export default async function IntegrationsSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  if (!canManageOrg(access.role)) {
    redirect(`/org/${params.slug}/dashboard`);
  }

  const xeroConnection = await prisma.xeroConnection.findUnique({
    where: { organizationId: access.organization.id },
    select: { tenantName: true, createdAt: true },
  });

  const connection = xeroConnection
    ? {
        tenantName: xeroConnection.tenantName,
        createdAt: xeroConnection.createdAt.toISOString(),
      }
    : null;

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <XeroIntegrationPanel slug={params.slug} connection={connection} />
    </Suspense>
  );
}
