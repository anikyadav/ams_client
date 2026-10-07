"use client";

import Link from "next/link";
import { Briefcase, ListChecks } from "lucide-react";
import { deadlineLabel } from "@/components/shared/deadline";
import { UserAvatar } from "@/components/shared/user-avatar";
import { collectTasks, taskHref } from "@/components/work/collect";
import { formatDate } from "@/lib/formats";
import { isClosedStatus, nepalToday } from "@/lib/project-tracking";
import type { Engagement } from "@/lib/types";

type Entry = { key: string; date: string; href: string; title: string; detail: string; who?: string; kind: "task" | "engagement" };

const HORIZON_DAYS = 30;

/** Agenda of deadlines: overdue first, then each day for the next 30 days, then anything later. */
export function WorkCalendar({ engagements }: { engagements: Engagement[] }) {
  const today = nepalToday();
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + HORIZON_DAYS);
  const limit = horizon.toISOString().slice(0, 10);

  const entries: Entry[] = [
    ...collectTasks(engagements)
      .filter(({ task }) => task.status !== "DONE" && task.dueDate)
      .map((item): Entry => ({
        key: `t-${item.task.id}`,
        date: item.task.dueDate!.slice(0, 10),
        href: taskHref(item),
        title: item.task.title,
        detail: `${item.engagement.client.name} · ${item.engagement.natureOfWork}`,
        who: item.task.assignedTo.name,
        kind: "task",
      })),
    ...engagements
      .filter((engagement) => !isClosedStatus(engagement.status) && engagement.targetDate)
      .map((engagement): Entry => ({
        key: `e-${engagement.id}`,
        date: engagement.targetDate!.slice(0, 10),
        href: `/engagements/${engagement.id}`,
        title: `${engagement.client.name} — target date`,
        detail: engagement.natureOfWork,
        who: engagement.staff.name,
        kind: "engagement",
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  const groups: { label: string; tone?: string; entries: Entry[] }[] = [];
  const overdue = entries.filter((entry) => entry.date < today);
  if (overdue.length) groups.push({ label: "Overdue", tone: "text-destructive", entries: overdue });
  for (const entry of entries.filter((item) => item.date >= today && item.date <= limit)) {
    const last = groups[groups.length - 1];
    if (last && last.label === entry.date) last.entries.push(entry);
    else groups.push({ label: entry.date, entries: [entry] });
  }
  const later = entries.filter((entry) => entry.date > limit);
  if (later.length) groups.push({ label: "Later", entries: later });

  if (!groups.length)
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No open deadlines. Set due dates on sub-tasks or target dates on engagements to see them here.
      </p>
    );
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Open sub-task due dates and engagement targets. Today is {formatDate(today)}.
      </p>
      {groups.map((group) => {
        const isDate = /^\d{4}-/.test(group.label);
        return (
          <section key={group.label} aria-label={isDate ? formatDate(group.label) : group.label} className="space-y-2">
            <h3 className={`flex items-baseline gap-2 text-sm font-semibold ${group.tone ?? ""}`}>
              {isDate ? formatDate(group.label) : group.label}
              {isDate && (
                <span className="text-xs font-normal text-muted-foreground">
                  {deadlineLabel(group.label)}
                </span>
              )}
            </h3>
            <ul className="space-y-2">
              {group.entries.map((entry) => (
                <li key={entry.key}>
                  <Link
                    href={entry.href}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      {entry.kind === "task" ? (
                        <ListChecks aria-label="Sub-task" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Briefcase aria-label="Engagement" className="mt-0.5 size-4 shrink-0 text-primary" />
                      )}
                      <span className="min-w-0">
                        <span className="block font-medium">{entry.title}</span>
                        <span className="block text-xs text-muted-foreground">{entry.detail}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {group.label === "Overdue" && (
                        <span className="font-medium text-destructive">{deadlineLabel(entry.date)}</span>
                      )}
                      {group.label === "Later" && <span>{formatDate(entry.date)}</span>}
                      {entry.who && (
                        <span className="flex items-center gap-1.5">
                          <UserAvatar name={entry.who} />
                          {entry.who}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
