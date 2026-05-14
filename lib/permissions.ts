import type { MemberRole } from "@prisma/client";
import { prisma } from "./prisma";

export { canApprove, canManageMembers, canManageOrg, canViewAllExpenses } from "./role-helpers";

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export async function requireOrgMember(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
  });
  if (!membership) {
    throw new PermissionError("Not a member of this organisation");
  }
  return membership;
}

export async function requireRole(userId: string, organizationId: string, roles: MemberRole[]) {
  const membership = await requireOrgMember(userId, organizationId);
  if (!roles.includes(membership.role)) {
    throw new PermissionError("Insufficient permissions");
  }
  return membership;
}
