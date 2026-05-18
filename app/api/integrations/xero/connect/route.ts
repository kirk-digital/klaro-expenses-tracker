export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createXeroClient } from "@/lib/xero-config";
import { resolveOrgAccess } from "@/lib/org";
import { canManageOrg } from "@/lib/role-helpers";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const orgSlug = new URL(req.url).searchParams.get("slug");
  if (!orgSlug) {
    return new NextResponse("Missing organisation", { status: 400 });
  }

  const access = await resolveOrgAccess(session.user.id, orgSlug);
  if (!access || !canManageOrg(access.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET || !process.env.XERO_REDIRECT_URI) {
    return new NextResponse("Xero integration is not configured", { status: 503 });
  }

  const xero = createXeroClient({ state: orgSlug });
  const consentUrl = await xero.buildConsentUrl();

  return NextResponse.redirect(consentUrl);
}
