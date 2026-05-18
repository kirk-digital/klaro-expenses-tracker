"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    <>
      {/* Mobile: dropdown select */}
      <div className="sm:hidden">
        <select
          value={pathname}
          onChange={(e) => router.push(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {tabs.map((tab) => (
            <option key={tab.href} value={tab.href}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: tab row */}
      <nav className="hidden gap-6 border-b border-slate-200 sm:flex">
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
    </>
  );
}
