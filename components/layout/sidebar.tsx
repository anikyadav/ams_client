"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { brand, navItems, type NavItem } from "@/components/layout/nav";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/page-header";
import { LogOutIcon } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--primary)]"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  const Icon = brand.icon;
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="flex items-center gap-2 px-2"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-semibold tracking-tight">{brand.name}</span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const visible = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-6 pb-4">
        <Brand onNavigate={onNavigate} />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {visible.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      {user ? (
        <div className="border-t px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <UserAvatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2 text-muted-foreground"
            onClick={logout}
          >
            <LogOutIcon className="size-4" />
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="sticky top-0 h-screen">
        <SidebarNav />
      </div>
    </aside>
  );
}
