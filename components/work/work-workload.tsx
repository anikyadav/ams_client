"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { collectTasks } from "@/components/work/collect";
import { isOverdue } from "@/lib/project-tracking";
import { matchesQuickFilter } from "@/lib/task-ui";
import type { Engagement } from "@/lib/types";

/** Who is carrying what: open, overdue and due-soon work per team member. */
export function WorkWorkload({ engagements }: { engagements: Engagement[] }) {
  const all = collectTasks(engagements);
  const rows = Array.from(
    new Map(all.map(({ task }) => [task.assignedToId, task.assignedTo])).values(),
  )
    .map((member) => {
      const tasks = all.filter(({ task }) => task.assignedToId === member.id).map(({ task }) => task);
      const todo = tasks.filter((task) => task.status === "TODO").length;
      const doing = tasks.filter((task) => task.status === "IN_PROGRESS").length;
      const done = tasks.filter((task) => task.status === "DONE").length;
      return {
        member,
        todo,
        doing,
        done,
        total: tasks.length,
        open: todo + doing,
        overdue: tasks.filter((task) => isOverdue(task.dueDate, task.status === "DONE")).length,
        week: tasks.filter((task) => matchesQuickFilter(task, "week", undefined)).length,
        engagements: new Set(
          all.filter(({ task }) => task.assignedToId === member.id).map(({ engagement }) => engagement.id),
        ).size,
      };
    })
    .sort((a, b) => b.open - a.open || a.member.name.localeCompare(b.member.name));
  const max = Math.max(1, ...rows.map((row) => row.total));

  if (!rows.length)
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No tasks are assigned yet.
      </p>
    );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Bars show each person&apos;s tasks this fiscal year: to do, in progress and done. Select a
        person to see their tasks.
      </p>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.member.id}>
            <Link
              href={`/work?tab=tasks&assignee=${row.member.id}&quick=open`}
              className="block space-y-3 rounded-xl border bg-card p-4 hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <UserAvatar name={row.member.name} />
                  {row.member.name}
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{row.open} open</span>
                  <span className={row.overdue ? "font-medium text-destructive" : ""}>
                    {row.overdue} overdue
                  </span>
                  <span>{row.week} due this week</span>
                  <span>
                    {row.engagements} engagement{row.engagements === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${row.todo} to do, ${row.doing} in progress, ${row.done} done`}
                className="flex h-2.5 overflow-hidden rounded-full bg-muted"
                style={{ width: `${Math.max(8, (row.total / max) * 100)}%` }}
              >
                <span className="bg-slate-400" style={{ flex: row.todo }} />
                <span className="bg-blue-500" style={{ flex: row.doing }} />
                <span className="bg-emerald-500" style={{ flex: row.done }} />
              </div>
              <p className="flex gap-4 text-[11px] text-muted-foreground">
                <span>{row.todo} to do</span>
                <span>{row.doing} in progress</span>
                <span>{row.done} done</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
