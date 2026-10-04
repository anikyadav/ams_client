"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { brand, navItems, type NavItem } from "@/components/layout/nav";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/page-header";
import { KeyRoundIcon, LogOutIcon } from "lucide-react";
import { useState } from "react";
import { ChangePasswordDialog } from "@/components/layout/change-password-dialog";
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
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--primary)]"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4.5" />
      {item.label}
    </Link>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      aria-label={`${brand.fullName} home`}
      className="flex items-center gap-3 rounded-lg px-1 py-1 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-border">
        <Image
          src={brand.mark}
          alt=""
          width={80}
          height={72}
          priority
          className="h-auto w-full object-contain"
        />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-lg font-bold tracking-tight text-primary">
          {brand.name}
        </span>
        <span className="block truncate text-[11px] font-medium text-muted-foreground">
          {brand.fullName}
        </span>
      </span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const visible = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-5">
        <Brand onNavigate={onNavigate} />
      </div>
      <p className="px-6 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Workspace
      </p>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {visible.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      {user ? (
        <div className="border-t px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
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
            onClick={() => setPasswordOpen(true)}
          >
            <KeyRoundIcon className="size-4" />
            Change password
          </Button>
          <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
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
