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
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden md:flex w-56 shrink-0 flex-col sticky top-0 h-screen overflow-y-auto border-r border-[#1a3070] p-4 bg-[#0F2057] text-white"
        )}
      >
        <SidebarContent slug={slug} orgName={orgName} role={role} userName={userName} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader slug={slug} orgName={orgName} role={role} userName={userName} />
        <main className="mx-auto w-full max-w-6xl flex-1 bg-background px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
