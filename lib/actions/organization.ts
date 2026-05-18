"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { OrgType } from "@prisma/client";
import { getDefaultCategories } from "@/lib/categories";
import { resolveOrgAccess } from "@/lib/org";
import { canManageOrg } from "@/lib/role-helpers";

export async function createOrganizationAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; slug?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be signed in" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const orgTypeRaw = String(formData.get("type") ?? "business").trim();
  const orgType: OrgType =
    orgTypeRaw === "sole_trader" || orgTypeRaw === "charity" ? orgTypeRaw : "business";
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name) {
    return { error: "Organisation name is required" };
  }
  if (!slug) {
    slug = slugify(name);
  } else {
    slug = slugify(slug);
  }
  if (!slug) {
    slug = `org-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  }

  const slugTaken = await prisma.organization.findUnique({ where: { slug } });
  if (slugTaken) {
    return { error: "That URL slug is already taken" };
  }

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, type: orgType, currency: "GBP" },
    });
    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId,
        role: "owner",
      },
    });
    await tx.category.createMany({
      data: getDefaultCategories(orgType).map((c) => ({
        organizationId: organization.id,
        name: c.name,
        hmrcCategory: c.hmrcCategory,
      })),
    });
    return organization;
  });

  return { slug: org.slug };
}

export async function updateOrganizationAction(
  slug: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const access = await resolveOrgAccess(userId, slug);
  if (!access || !canManageOrg(access.role)) {
    return { error: "Forbidden" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Enter a valid organisation name" };
  }

  const requiresApproval = formData.get("requiresApproval") === "on";

  await prisma.organization.update({
    where: { id: access.organization.id },
    data: { name, requiresApproval },
  });

  return {};
}
