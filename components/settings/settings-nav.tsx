"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsNav({ slug, orgType }: { slug: string; orgType: string }) {
  const pathname = usePathname();
  const links = [
    { href: `/org/${slug}/settings`, label: "General" },
    { href: `/org/${slug}/settings/members`, label: "Members" },
    { href: `/org/${slug}/settings/categories`, label: "Categories" },
    ...(orgType === "charity"
      ? [{ href: `/org/${slug}/settings/funds`, label: "Funds" }]
      : []),
    { href: `/org/${slug}/settings/security`, label: "Security" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-2">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border bg-background font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
