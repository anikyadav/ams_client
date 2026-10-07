"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EngagementProgressControl } from "@/components/engagements/engagement-progress-control";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { deadlineLabel } from "@/components/shared/deadline";
import { HealthChip } from "@/components/shared/health-chip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { engagementHealth } from "@/lib/health";
import { useEngagementActivity } from "@/lib/hooks";
import { isOverdue } from "@/lib/project-tracking";
import { matchesQuickFilter } from "@/lib/task-ui";
import type { Engagement, SubTask } from "@/lib/types";

/** Summary of one engagement: health, what needs attention, who carries the work and recent changes. */
export function EngagementOverview({ engagement }: { engagement: Engagement }) {
  const health = engagementHealth(engagement);
  const activity = useEngagementActivity(engagement.id, true);
  const recent = (Array.isArray(activity.data) ? activity.data : []).slice(0, 5);
  const attention = engagement.subTasks
    .filter(
      (task) =>
        matchesQuickFilter(task, "overdue", undefined) ||
        matchesQuickFilter(task, "week", undefined),
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const people = Array.from(
    new Map(engagement.subTasks.map((task) => [task.assignedToId, task.assignedTo])).values(),
  ).map((member) => {
    const tasks = engagement.subTasks.filter((task) => task.assignedToId === member.id);
    const done = tasks.filter((task) => task.status === "DONE").length;
    return {
      member,
      total: tasks.length,
      done,
      overdue: tasks.filter((task) => isOverdue(task.dueDate, task.status === "DONE")).length,
    };
  });
  const taskLink = (task: SubTask) =>
    `/engagements/${engagement.id}?tab=tasks&task=${task.id}`;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {health ? (
              <>
                <HealthChip engagement={engagement} />
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {health.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This engagement is closed, so deadlines no longer affect its health.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attention.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing is overdue or due in the next 7 days.
              </p>
            )}
            {attention.map((task) => {
              const overdue = isOverdue(task.dueDate, false);
              return (
                <Link
                  key={task.id}
                  href={taskLink(task)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <UserAvatar name={task.assignedTo.name} />
                      {task.assignedTo.name}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}
                    >
                      <CalendarDays className="size-3.5" />
                      {task.dueDate ? deadlineLabel(task.dueDate) : ""}
                    </span>
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {people.length === 0 && (
              <p className="text-sm text-muted-foreground">No sub-tasks assigned yet.</p>
            )}
            {people.map(({ member, total, done, overdue }) => (
              <Link
                key={member.id}
                href={`/engagements/${engagement.id}?tab=tasks&assignee=${member.id}`}
                className="block space-y-2 rounded-lg border px-3 py-2.5 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <UserAvatar name={member.name} />
                    {member.name}
                    {member.id === engagement.staffId && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        Lead
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {done}/{total} done
                    {overdue > 0 && (
                      <span className="ml-2 font-medium text-destructive">{overdue} overdue</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={total ? (done / total) * 100 : 0}
                  aria-label={`Completed share for ${member.name}`}
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6">
        <EngagementProgressControl engagement={engagement} />
        <Card>
          <CardHeader>
            <CardTitle>Latest activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded changes yet.</p>
            ) : (
              <ActivityTimeline entries={recent} />
            )}
            <Link
              href={`/engagements/${engagement.id}?tab=activity`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              See all discussion and activity
            </Link>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
