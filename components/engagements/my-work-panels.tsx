"use client";

import Link from "next/link";
import { CheckCircle2Icon, ClockIcon, ListChecksIcon, TriangleAlertIcon } from "lucide-react";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/formats";
import { useMyActivity } from "@/lib/hooks";
import { nepalToday } from "@/lib/project-tracking";
import type { Engagement, SubTask } from "@/lib/types";

export type MyTask = { task: SubTask; engagement: Engagement };

export function collectMyTasks(engagements: Engagement[], userId: string): MyTask[] {
  return engagements.flatMap((engagement) =>
    engagement.subTasks
      .filter((task) => task.assignedToId === userId)
      .map((task) => ({ task, engagement })),
  );
}

export function MyWorkSummary({ tasks, now = new Date() }: { tasks: MyTask[]; now?: Date }) {
  const today = nepalToday(now);
  const open = tasks.filter(({ task }) => task.status !== "DONE");
  const overdue = open.filter(({ task }) => task.dueDate && task.dueDate.slice(0, 10) < today);
  const week = new Date(`${today}T00:00:00Z`);
  week.setUTCDate(week.getUTCDate() + 7);
  const weekEnd = week.toISOString().slice(0, 10);
  const soon = open.filter(
    ({ task }) => task.dueDate && task.dueDate.slice(0, 10) >= today && task.dueDate.slice(0, 10) <= weekEnd,
  );
  const stats = [
    { label: "Open tasks", value: open.length, icon: ListChecksIcon },
    { label: "Due in 7 days", value: soon.length, icon: ClockIcon },
    { label: "Overdue", value: overdue.length, icon: TriangleAlertIcon, alert: overdue.length > 0 },
    { label: "Completed", value: tasks.length - open.length, icon: CheckCircle2Icon },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, alert }) => (
        <Card key={label} size="sm">
          <CardContent className="flex items-center gap-3">
            <Icon aria-hidden="true" className={`size-5 ${alert ? "text-destructive" : "text-muted-foreground"}`} />
            <div>
              <p className={`text-2xl font-semibold tabular-nums ${alert ? "text-destructive" : ""}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CompletedTasks({ tasks }: { tasks: MyTask[] }) {
  const done = tasks
    .filter(({ task }) => task.status === "DONE")
    .sort((a, b) => (b.task.completedAt ?? b.task.createdAt).localeCompare(a.task.completedAt ?? a.task.createdAt));
  if (!done.length)
    return <p className="text-sm text-muted-foreground">You have not completed any tasks in this fiscal year yet.</p>;
  return (
    <ul className="space-y-2">
      {done.map(({ task, engagement }) => (
        <li key={task.id} className="rounded-lg border bg-card p-3 text-sm">
          <Link className="font-medium hover:underline" href={`/tasks/${task.id}`}>{task.title}</Link>
          <p className="text-muted-foreground">{engagement.client.name} — {engagement.natureOfWork}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {task.completedAt ? `Completed ${formatDateTime(task.completedAt)}` : "Completed"}
            {task.dueDate ? ` · was due ${formatDate(task.dueDate)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MyActivity() {
  const activity = useMyActivity();
  if (activity.isLoading) return <p className="text-sm text-muted-foreground">Loading your activity…</p>;
  if (activity.error) return <p role="alert" className="text-sm text-destructive">Could not load your activity.</p>;
  if (!activity.data?.length)
    return <p className="text-sm text-muted-foreground">No recorded activity yet. Your updates and changes to your tasks appear here.</p>;
  return <ActivityTimeline entries={activity.data} showEngagement />;
}

const TABS = [
  { id: "assigned", label: "Assigned" },
  { id: "completed", label: "Completed" },
  { id: "activity", label: "My activity" },
] as const;
export type MyWorkTab = (typeof TABS)[number]["id"];

export function MyWorkTabs({ value, onChange }: { value: MyWorkTab; onChange: (tab: MyWorkTab) => void }) {
  return (
    <div role="group" aria-label="My work sections" className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={value === tab.id ? "default" : "outline"}
          aria-pressed={value === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

