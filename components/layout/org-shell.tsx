"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MemberRole } from "@prisma/client";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { canApprove, canManageOrg } from "@/lib/role-helpers";

const nav = (slug: string) => [
  { href: `/org/${slug}/dashboard`, label: "Dashboard" },
  { href: `/org/${slug}/expenses`, label: "Expenses" },
  { href: `/org/${slug}/approvals`, label: "Approvals", role: "approver" as const },
  { href: `/org/${slug}/notifications`, label: "Notifications" },
  { href: `/org/${slug}/settings`, label: "Settings", role: "admin" as const },
];

function NavLinks({
  slug,
  role,
  onNavigate,
}: {
  slug: string;
  role: MemberRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {nav(slug).map((item) => {
        if (item.role === "approver" && !canApprove(role)) return null;
        if (item.role === "admin" && !canManageOrg(role)) return null;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function OrgShell({
  slug,
  orgName,
  role,
  children,
}: {
  slug: string;
  orgName: string;
  role: MemberRole;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar p-4 md:block">
        <div className="mb-6 px-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Organisation
          </p>
          <p className="truncate font-semibold">{orgName}</p>
        </div>
        <NavLinks slug={slug} role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b bg-background px-4 py-3 md:hidden">
          <Sheet>
            <SheetTrigger
              className={buttonVariants({ variant: "outline", size: "icon" })}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Organisation
                </p>
                <p className="truncate font-semibold">{orgName}</p>
              </div>
              <NavLinks slug={slug} role={role} />
            </SheetContent>
          </Sheet>
          <span className="truncate font-medium">{orgName}</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
