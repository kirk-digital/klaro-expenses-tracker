"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const baseClass =
  "relative pb-3 text-sm font-medium transition-colors whitespace-nowrap";
const activeClass =
  "text-[#1E3A8A] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-cyan-400";
const inactiveClass = "text-slate-500 hover:text-slate-800";

export function SettingsNav({ slug, orgType }: { slug: string; orgType: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/org/${slug}/settings`, label: "General" },
    { href: `/org/${slug}/settings/members`, label: "Members" },
    { href: `/org/${slug}/settings/categories`, label: "Categories" },
    ...(orgType === "charity"
      ? [{ href: `/org/${slug}/settings/funds`, label: "Funds" }]
      : []),
    { href: `/org/${slug}/settings/integrations`, label: "Integrations" },
    { href: `/org/${slug}/settings/security`, label: "Security" },
  ];

  function isActive(href: string) {
    return pathname === href;
  }

  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(baseClass, isActive(tab.href) ? activeClass : inactiveClass)}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
