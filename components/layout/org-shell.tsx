"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { MemberRole } from "@prisma/client";
import {
  Menu,
  LayoutDashboard,
  Receipt,
  CheckSquare,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { canApprove, canManageOrg } from "@/lib/role-helpers";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  role?: "approver" | "admin";
};

const nav = (slug: string): NavItem[] => [
  { href: `/org/${slug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { href: `/org/${slug}/expenses`, label: "Expenses", icon: Receipt },
  { href: `/org/${slug}/approvals`, label: "Approvals", icon: CheckSquare, role: "approver" },
  { href: `/org/${slug}/notifications`, label: "Notifications", icon: Bell },
  { href: `/org/${slug}/settings`, label: "Settings", icon: Settings, role: "admin" },
];

function SidebarContent({
  slug,
  orgName,
  role,
  userName,
  onNavigate,
}: {
  slug: string;
  orgName: string;
  role: MemberRole;
  userName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 px-2">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Organisation
        </p>
        <p className="truncate font-bold text-white">{orgName}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav(slug).map((item) => {
          if (item.role === "approver" && !canApprove(role)) return null;
          if (item.role === "admin" && !canManageOrg(role)) return null;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-700 pt-4">
        <p className="truncate px-2 text-sm font-medium text-white">{userName}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

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
      <aside className={cn("hidden w-56 shrink-0 border-r border-slate-800 p-4 md:block", sidebarClass)}>
        <SidebarContent slug={slug} orgName={orgName} role={role} userName={userName} />
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
            <SheetContent side="left" className={cn("w-64 border-slate-800", sidebarClass)}>
              <SidebarContent
                slug={slug}
                orgName={orgName}
                role={role}
                userName={userName}
              />
            </SheetContent>
          </Sheet>
          <span className="truncate font-medium">{orgName}</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
