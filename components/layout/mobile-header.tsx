"use client";

import { useState } from "react";
import type { MemberRole } from "@prisma/client";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { SidebarContent } from "./sidebar-content";

export function MobileHeader({
  slug,
  orgName,
  role,
  userName,
}: {
  slug: string;
  orgName: string;
  role: MemberRole;
  userName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={buttonVariants({ variant: "outline", size: "icon" })}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-slate-800 bg-slate-900 p-4 text-white">
          <SidebarContent
            slug={slug}
            orgName={orgName}
            role={role}
            userName={userName}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-500 text-[10px] font-bold text-white">
        {orgName.slice(0, 1).toUpperCase()}
      </div>
      <span className="truncate text-sm font-semibold">{orgName}</span>
    </header>
  );
}
