import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your organisation</p>
      </div>
      <SettingsNav slug={params.slug} />
      {children}
    </div>
  );
}
