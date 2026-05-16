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
    <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-[#1a3070] bg-[#0F2057] px-4 py-3 md:hidden backdrop-blur-sm">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "text-white hover:bg-white/10 hover:text-white",
          })}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-[#1a3070] bg-[#0F2057] p-4 text-white">
          <SidebarContent
            slug={slug}
            orgName={orgName}
            role={role}
            userName={userName}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-cyan-400 text-[10px] font-bold text-[#0F2057]">
        {orgName.slice(0, 1).toUpperCase()}
      </div>
      <span className="truncate text-sm font-semibold text-white">{orgName}</span>
    </header>
  );
}
