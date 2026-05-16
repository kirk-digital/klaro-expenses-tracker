import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveOrgAccess } from "@/lib/org";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1E3A8A]">Settings</h1>
        <p className="text-muted-foreground">Manage your organisation</p>
      </div>
      <SettingsNav slug={params.slug} orgType={access.organization.type} />
      {children}
    </div>
  );
}
