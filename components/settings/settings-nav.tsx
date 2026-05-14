"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = (slug: string) => [
  { href: `/org/${slug}/settings`, label: "General" },
  { href: `/org/${slug}/settings/members`, label: "Members" },
  { href: `/org/${slug}/settings/categories`, label: "Categories" },
];

export function SettingsNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-2">
      {links(slug).map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
