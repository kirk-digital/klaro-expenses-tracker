import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveOrgAccess } from "@/lib/org";
import { OrgShell } from "@/components/layout/org-shell";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) {
    notFound();
  }

  return (
    <OrgShell
      slug={params.slug}
      orgName={access.organization.name}
      role={access.role}
      userName={session.user.name ?? session.user.email ?? "User"}
    >
      {children}
    </OrgShell>
  );
}
