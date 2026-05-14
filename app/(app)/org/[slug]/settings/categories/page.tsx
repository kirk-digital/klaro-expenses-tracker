import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgAccess } from "@/lib/org";
import { canManageMembers } from "@/lib/role-helpers";
import { CategoriesPanel } from "@/components/settings/categories-panel";

type Props = { params: { slug: string } };

export default async function CategoriesSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  if (!canManageMembers(access.role)) {
    redirect(`/org/${params.slug}/dashboard`);
  }

  const categories = await prisma.category.findMany({
    where: { organizationId: access.organization.id },
    orderBy: { name: "asc" },
  });

  return <CategoriesPanel slug={params.slug} initialCategories={categories} />;
}
