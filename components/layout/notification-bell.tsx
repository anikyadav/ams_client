"use client";

import Link from "next/link";
import { useState } from "react";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/formats";
import { useMarkNotificationsRead, useNotifications } from "@/lib/hooks";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

function target(item: AppNotification) {
  if (item.subTaskId) return `/tasks/${item.subTaskId}`;
  if (item.engagementId) return `/engagements/${item.engagementId}`;
  return null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const inbox = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = inbox.data?.unreadCount ?? 0;
  const items = inbox.data?.items ?? [];
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen(true)}
      >
        <BellIcon className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Assignments, updates, comments and deadlines that need your attention.
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between px-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {unread ? `${unread} unread` : "You're all caught up"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={!unread || markRead.isPending}
              onClick={() => markRead.mutate(undefined)}
            >
              <CheckCheckIcon className="size-4" />
              Mark all read
            </Button>
          </div>
          <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            {inbox.isLoading && (
              <li className="text-sm text-muted-foreground">Loading…</li>
            )}
            {inbox.error && (
              <li role="alert" className="text-sm text-destructive">
                Could not load notifications.
              </li>
            )}
            {!inbox.isLoading && !inbox.error && items.length === 0 && (
              <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </li>
            )}
            {items.map((item) => {
              const href = target(item);
              const body = (
                <>
                  <div className="flex items-start gap-2">
                    {!item.readAt && (
                      <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 break-words text-sm text-muted-foreground">{item.message}</p>
                      <time className="mt-1 block text-xs text-muted-foreground" dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    </div>
                  </div>
                </>
              );
              const className = cn(
                "block rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                !item.readAt && "bg-primary/5",
              );
              return (
                <li key={item.id}>
                  {href ? (
                    <Link
                      href={href}
                      className={className}
                      onClick={() => {
                        if (!item.readAt) markRead.mutate(item.id);
                        setOpen(false);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={className}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
