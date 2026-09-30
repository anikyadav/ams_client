"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubTaskMilestoneControl } from "./subtask-milestone-control";
import { TaskDiscussion } from "./task-discussion";
import type { Engagement } from "@/lib/types";

export function DashboardTasks({ engagements }: { engagements: Engagement[] }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState("Open");
  const tasks = engagements.flatMap((engagement) => engagement.subTasks
    .filter((task) => user?.role === "AUDITOR" || task.assignedToId === user?.id)
    .map((task) => ({ task, engagement })));
  const visible = tasks.filter(({ task }) => filter === "All" || (filter === "Complete" ? task.status === "DONE" : task.status !== "DONE"));
  return <Card>
    <CardHeader className="space-y-3">
      <CardTitle>{user?.role === "AUDITOR" ? "Team tasks" : "My assigned tasks"}</CardTitle>
      <p className="text-sm text-muted-foreground">Update a milestone, share progress, or reply in the task discussion. 100% marks the task complete for everyone. Updates refresh every 10 seconds.</p>
      <div className="flex flex-wrap gap-2">{["Open", "Complete", "All"].map((value) => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value} ({tasks.filter(({ task }) => value === "All" || (value === "Complete" ? task.status === "DONE" : task.status !== "DONE")).length})</Button>)}</div>
    </CardHeader>
    <CardContent className="space-y-4">
      {visible.length === 0 && <p className="text-sm text-muted-foreground">No tasks in this view.</p>}
      {visible.map(({ task, engagement }) => <article key={task.id} aria-label={task.title} className="space-y-3 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-medium">{task.title}</h3>
            <Link href={`/engagements/${engagement.id}#subtask-${task.id}`} className="text-sm underline">{engagement.client.name} · {engagement.natureOfWork}</Link>
            <p className="text-xs text-muted-foreground">Assigned to {task.assignedTo.name}</p>
            {task.description && <p className="whitespace-pre-wrap break-words text-sm">{task.description}</p>}
          </div>
          <SubTaskMilestoneControl task={task} />
        </div>
        <TaskDiscussion engagement={engagement} task={task} />
      </article>)}
    </CardContent>
  </Card>;
}
