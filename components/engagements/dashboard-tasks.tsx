"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deadlineLabel } from "@/components/shared/deadline";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SubTaskStatusControl } from "./subtask-status-control";
import { TaskBadges } from "./task-badges";
import { TaskDiscussion } from "./task-discussion";
import { formatDate } from "@/lib/formats";
import { isOverdue } from "@/lib/project-tracking";
import { cn } from "@/lib/utils";
import type { Engagement, SubTask } from "@/lib/types";

const PAGE_SIZE = 12;
const filters = ["Open", "Overdue", "Complete", "All"] as const;
type Filter = (typeof filters)[number];

const matches = (task: SubTask, filter: Filter) =>
  filter === "All" ||
  (filter === "Complete"
    ? task.status === "DONE"
    : filter === "Overdue"
      ? isOverdue(task.dueDate, task.status === "DONE")
      : task.status !== "DONE");

export function DashboardTasks({ engagements }: { engagements: Engagement[] }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("Open");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const tasks = engagements.flatMap((engagement) =>
    engagement.subTasks
      .filter((task) => user?.role === "AUDITOR" || task.assignedToId === user?.id)
      .map((task) => ({ task, engagement })),
  );
  // Overdue first, then by due date, so the most urgent work is never below the fold.
  const visible = tasks
    .filter(({ task }) => matches(task, filter))
    .sort(
      (a, b) =>
        Number(isOverdue(b.task.dueDate, false)) - Number(isOverdue(a.task.dueDate, false)) ||
        (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999"),
    );
  const shown = visible.slice(0, limit);
  const groups = shown.reduce<{ engagement: Engagement; items: SubTask[] }[]>(
    (acc, { task, engagement }) => {
      const group = acc.find((item) => item.engagement.id === engagement.id);
      if (group) group.items.push(task);
      else acc.push({ engagement, items: [task] });
      return acc;
    },
    [],
  );
  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>{user?.role === "AUDITOR" ? "Team tasks" : "My assigned tasks"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Grouped by engagement, most urgent first. Change a status here or open a task for its
          details and discussion.
        </p>
        <div className="flex flex-wrap gap-2">
          {filters.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setLimit(PAGE_SIZE);
              }}
            >
              {value} ({tasks.filter(({ task }) => matches(task, value)).length})
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks in this view.</p>
        )}
        {groups.map(({ engagement, items }) => (
          <section
            key={engagement.id}
            aria-label={`${engagement.client.name} tasks`}
            className="space-y-2"
          >
            <h3 className="text-sm font-semibold">
              <Link href={`/engagements/${engagement.id}`} className="hover:underline">
                {engagement.client.name} · {engagement.natureOfWork}
              </Link>
            </h3>
            {items.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status === "DONE");
              const href = `/engagements/${engagement.id}?task=${task.id}`;
              return (
                <article
                  key={task.id}
                  aria-label={task.title}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      href={href}
                      className="break-words text-sm font-medium hover:text-primary"
                    >
                      {task.title}
                    </Link>{" "}
                    <TaskBadges task={task} />
                  </div>
                  <span className="flex items-center gap-2 text-xs" title={task.assignedTo.name}>
                    <UserAvatar name={task.assignedTo.name} />
                    <span className="hidden lg:inline">{task.assignedTo.name}</span>
                  </span>
                  <span
                    title={task.dueDate ? formatDate(task.dueDate) : undefined}
                    className={cn(
                      "flex items-center gap-1 whitespace-nowrap text-xs",
                      overdue ? "font-medium text-destructive" : "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="size-3.5" />
                    {task.dueDate
                      ? task.status === "DONE"
                        ? formatDate(task.dueDate)
                        : deadlineLabel(task.dueDate)
                      : "No due date"}
                  </span>
                  <SubTaskStatusControl task={task} compact />
                  <TaskDiscussion engagement={engagement} task={task} />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    nativeButton={false}
                    aria-label={`Open ${task.title}`}
                    render={<Link href={href} />}
                  >
                    <ExternalLink />
                  </Button>
                </article>
              );
            })}
          </section>
        ))}
        {visible.length > limit && (
          <Button variant="outline" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
            Show more ({visible.length - limit} remaining)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
