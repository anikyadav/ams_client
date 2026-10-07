"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { CommandPaletteTrigger } from "./command-palette";
import { navItems } from "./nav";
import { useAuth } from "@/components/providers/auth-provider";
import { UserAvatar } from "@/components/shared/user-avatar";

export function WorkspaceHeader({ controls }: { controls: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const section = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-h-16 items-center gap-3">
        <MobileNav />
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 text-sm font-medium">
          {section && <ol className="flex items-center gap-2">
            <li>{pathname === section.href ? <span aria-current="page">{section.label}</span> : <Link aria-label={`Back to ${section.label}`} className="text-muted-foreground hover:text-primary" href={section.href}>{section.label}</Link>}</li>
            {pathname !== section.href && <><li aria-hidden="true"><ChevronRight className="size-4 text-muted-foreground" /></li><li aria-current="page">Details</li></>}
          </ol>}
        </nav>
        <CommandPaletteTrigger />
        <NotificationBell />
        <ThemeToggle />
        {user && <div className="hidden items-center gap-2 border-l pl-4 sm:flex"><UserAvatar name={user.name} /><span className="max-w-36 truncate text-sm">{user.name}</span></div>}
      </div>
      {controls}
    </header>
  );
}
