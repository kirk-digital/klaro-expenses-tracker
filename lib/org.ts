import type { MemberRole, Organization } from "@prisma/client";
import { cache } from "react";
import { prisma } from "./prisma";

export type OrgAccess = {
  organization: Organization;
  role: MemberRole;
};

export async function resolveOrgAccess(
  userId: string,
  slug: string | null | undefined
): Promise<OrgAccess | null> {
  if (!slug) return null;
  const organization = await prisma.organization.findUnique({
    where: { slug },
  });
  if (!organization) return null;
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: organization.id, userId },
  });
  if (!membership) return null;
  return { organization, role: membership.role };
}

export const getOrgAccess = cache(async (userId: string, slug: string) => {
  return resolveOrgAccess(userId, slug);
});
