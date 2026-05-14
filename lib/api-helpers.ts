import type { MemberRole, Organization } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { resolveOrgAccess } from "@/lib/org";

export type OrgRequestContext = {
  userId: string;
  organization: Organization;
  role: MemberRole;
};

export function getOrgSlugFromRequest(request: Request) {
  return (
    request.headers.get(ORG_SLUG_HEADER) ?? new URL(request.url).searchParams.get("orgSlug")
  );
}

export async function requireSessionUserId(): Promise<{ userId: string } | Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId };
}

export async function requireOrgFromRequest(
  request: Request
): Promise<OrgRequestContext | Response> {
  const session = await requireSessionUserId();
  if (session instanceof Response) return session;

  const slug = getOrgSlugFromRequest(request);
  const ctx = await resolveOrgAccess(session.userId, slug);
  if (!ctx) {
    return Response.json({ error: "Organisation not found or access denied" }, { status: 403 });
  }

  return {
    userId: session.userId,
    organization: ctx.organization,
    role: ctx.role,
  };
}
