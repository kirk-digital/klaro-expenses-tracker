"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { MemberRole } from "@prisma/client";
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export function SidebarContent({
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
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-400 text-xs font-bold text-[#0F2057]">
          {orgName.slice(0, 1).toUpperCase()}
        </div>
        <p className="truncate text-sm font-semibold text-white">{orgName}</p>
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
                  ? "bg-cyan-400/15 text-cyan-400"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-700 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold text-white">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <p className="truncate text-sm font-medium text-white">{userName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
