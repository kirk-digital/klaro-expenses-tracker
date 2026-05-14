import type { MemberRole } from "@prisma/client";

export function canApprove(role: MemberRole) {
  return role === "owner" || role === "admin" || role === "approver";
}

export function canManageMembers(role: MemberRole) {
  return role === "owner" || role === "admin";
}

export function canManageOrg(role: MemberRole) {
  return role === "owner" || role === "admin";
}

export function canViewAllExpenses(role: MemberRole) {
  return role === "owner" || role === "admin" || role === "approver";
}
