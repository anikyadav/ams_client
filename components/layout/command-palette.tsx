"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, CornerDownLeft, ListChecks, Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { navItems } from "@/components/layout/nav";
import { useAuth } from "@/components/providers/auth-provider";
import { useClients, useEngagements } from "@/lib/hooks";
import { canViewEngagement } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  group: string;
  label: string;
  detail?: string;
  href: string;
  icon: LucideIcon;
};

const PER_GROUP = 6;
const OPEN_EVENT = "open-command-palette";

/** Header buttons. They only signal the palette, which lives inside the fiscal-year context. */
export function CommandPaletteTrigger() {
  const open = () => window.dispatchEvent(new Event(OPEN_EVENT));
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:flex"
        aria-label="Search (Ctrl K)"
        onClick={open}
      >
        <Search className="size-4" />
        Search
        <kbd className="rounded border bg-muted px-1.5 text-[10px] font-medium">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={open}>
        <Search className="size-5" />
      </Button>
    </>
  );
}

/** Ctrl/⌘+K search across pages, engagements, tasks and (for auditors) clients. */
export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const engagements = useEngagements(open);
  const clients = useClients();

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const results = useMemo(() => {
    if (!user) return [];
    const needle = query.trim().toLowerCase();
    const match = (text: string) => !needle || text.toLowerCase().includes(needle);
    const visible = (engagements.data ?? []).filter((item) => canViewEngagement(user, item));
    const pages: Result[] = navItems
      .filter((item) => item.roles.includes(user.role) && match(item.label))
      .map((item) => ({
        id: `page-${item.href}`,
        group: "Pages",
        label: item.label,
        href: item.href,
        icon: item.icon,
      }));
    const jobs: Result[] = visible
      .filter((item) => match(`${item.client.name} ${item.natureOfWork}`))
      .slice(0, PER_GROUP)
      .map((item) => ({
        id: `job-${item.id}`,
        group: "Engagements",
        label: `${item.client.name} — ${item.natureOfWork}`,
        detail: item.staff.name,
        href: `/engagements/${item.id}`,
        icon: Briefcase,
      }));
    // Tasks only appear once something is typed, to keep the empty palette short.
    const tasks: Result[] = needle
      ? visible
          .flatMap((engagement) => engagement.subTasks.map((task) => ({ task, engagement })))
          .filter(
            ({ task, engagement }) =>
              (user.role === "AUDITOR" || task.assignedToId === user.id) &&
              match(`${task.title} ${engagement.client.name}`),
          )
          .slice(0, PER_GROUP)
          .map(({ task, engagement }) => ({
            id: `task-${task.id}`,
            group: "Tasks",
            label: task.title,
            detail: `${engagement.client.name} · ${engagement.natureOfWork}`,
            href: `/engagements/${engagement.id}?task=${task.id}`,
            icon: ListChecks,
          }))
      : [];
    const people: Result[] =
      user.role === "AUDITOR"
        ? (clients.data ?? [])
            .filter((client) => needle && match(client.name))
            .slice(0, PER_GROUP)
            .map((client) => ({
              id: `client-${client.id}`,
              group: "Clients",
              label: client.name,
              href: `/clients/${client.id}`,
              icon: Building2,
            }))
        : [];
    return [...pages, ...jobs, ...tasks, ...people];
  }, [user, query, engagements.data, clients.data]);

  const go = (result: Result | undefined) => {
    if (!result) return;
    setOpen(false);
    router.push(result.href);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((value) => (results.length ? (value + step + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  };
  const groups = results.reduce<{ name: string; items: Result[] }[]>((acc, result) => {
    const group = acc.find((item) => item.name === result.group);
    if (group) group.items.push(result);
    else acc.push({ name: result.group, items: [result] });
    return acc;
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setActive(0);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, engagements, tasks and clients. Use the arrow keys and Enter to open a result.
          </DialogDescription>
          <div className="flex items-center gap-2 border-b px-3">
            <Search aria-hidden="true" className="size-4 text-muted-foreground" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls="command-results"
              aria-activedescendant={results[active] ? `option-${results[active].id}` : undefined}
              aria-label="Search the workspace"
              placeholder="Search engagements, tasks, clients…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          <div id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {engagements.isLoading ? "Loading…" : "No results."}
              </p>
            )}
            {groups.map((group) => (
              <div key={group.name} role="group" aria-label={group.name} className="pb-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.name}
                </p>
                {group.items.map((result) => {
                  const Icon = result.icon;
                  const selected = results[active]?.id === result.id;
                  return (
                    <div
                      key={result.id}
                      id={`option-${result.id}`}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActive(results.indexOf(result))}
                      onClick={() => go(result)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                        selected && "bg-muted",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{result.label}</span>
                        {result.detail && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.detail}
                          </span>
                        )}
                      </span>
                      {selected && <CornerDownLeft aria-hidden="true" className="size-3.5 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
