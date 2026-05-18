export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canManageOrg } from "@/lib/role-helpers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const orgSlug = new URL(req.url).searchParams.get("slug");
  if (!orgSlug) {
    return NextResponse.json({ error: "Missing organisation" }, { status: 400 });
  }

  const access = await resolveOrgAccess(session.user.id, orgSlug);
  if (!access || !canManageOrg(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.xeroConnection.deleteMany({
    where: { organizationId: access.organization.id },
  });

  return NextResponse.json({ ok: true });
}
