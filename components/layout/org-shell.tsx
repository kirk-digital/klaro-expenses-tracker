import type { MemberRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { MobileHeader } from "./mobile-header";
import { SidebarContent } from "./sidebar-content";

export function OrgShell({
  slug,
  orgName,
  role,
  userName,
  children,
}: {
  slug: string;
  orgName: string;
  role: MemberRole;
  userName: string;
  children: React.ReactNode;
}) {
  const sidebarClass = "bg-slate-900 text-white";

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "hidden w-56 shrink-0 border-r border-slate-800 p-4 md:block",
          sidebarClass
        )}
      >
        <SidebarContent slug={slug} orgName={orgName} role={role} userName={userName} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader slug={slug} orgName={orgName} role={role} userName={userName} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
