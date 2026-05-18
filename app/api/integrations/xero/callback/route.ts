export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createXeroClient, tokenExpiresAt } from "@/lib/xero-config";
import { resolveOrgAccess } from "@/lib/org";
import { canManageOrg } from "@/lib/role-helpers";

function baseUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("state") ?? "";
  const settingsUrl = `${baseUrl()}/org/${orgSlug}/settings/integrations`;

  if (url.searchParams.get("error") || !url.searchParams.get("code")) {
    return NextResponse.redirect(`${settingsUrl}?error=xero_auth_failed`);
  }

  if (!orgSlug) {
    return NextResponse.redirect(`${baseUrl()}/sign-in`);
  }

  const access = await resolveOrgAccess(session.user.id, orgSlug);
  if (!access || !canManageOrg(access.role)) {
    return NextResponse.redirect(`${settingsUrl}?error=forbidden`);
  }

  try {
    const xero = createXeroClient({ state: orgSlug });
    const tokenSet = await xero.apiCallback(req.url);
    await xero.updateTenants();

    const tenant = xero.tenants[0];
    if (!tenant?.tenantId) {
      return NextResponse.redirect(`${settingsUrl}?error=no_tenant`);
    }

    const tenantName =
      tenant.tenantName ??
      tenant.orgData?.name ??
      tenant.tenantId;

    await prisma.xeroConnection.upsert({
      where: { organizationId: access.organization.id },
      create: {
        organizationId: access.organization.id,
        tenantId: tenant.tenantId,
        tenantName,
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token!,
        expiresAt: tokenExpiresAt(tokenSet),
      },
      update: {
        tenantId: tenant.tenantId,
        tenantName,
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token!,
        expiresAt: tokenExpiresAt(tokenSet),
      },
    });

    return NextResponse.redirect(`${settingsUrl}?connected=1`);
  } catch (err) {
    console.error("[xero] OAuth callback failed:", err);
    return NextResponse.redirect(`${settingsUrl}?error=xero_auth_failed`);
  }
}
