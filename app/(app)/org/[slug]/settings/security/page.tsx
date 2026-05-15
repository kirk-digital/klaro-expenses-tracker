import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveOrgAccess } from "@/lib/org";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

type Props = { params: { slug: string } };

export default async function SecuritySettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const access = await resolveOrgAccess(session.user.id, params.slug);
  if (!access) redirect("/sign-in");

  return (
    <div className="max-w-lg">
      <ChangePasswordForm />
    </div>
  );
}
