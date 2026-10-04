"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Flag, UserRound } from "lucide-react";
import { CommentThread } from "@/components/engagements/comment-thread";
import { SubTaskStatusControl } from "@/components/engagements/subtask-status-control";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { Deadline } from "@/components/shared/deadline";
import { QueryState } from "@/components/shared/query-state";
import { EngagementStatusBadge, SubTaskStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/formats";
import { useEngagement, useSubTask, useSubTaskActivity } from "@/lib/hooks";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const task = useSubTask(id);
  const activity = useSubTaskActivity(id);
  const engagement = useEngagement(task.data?.engagementId);
  if (task.isLoading || task.error || !task.data)
    return (
      <QueryState
        loading={task.isLoading}
        error={task.error ?? (task.data ? null : new Error("Task not found"))}
        retry={() => void task.refetch()}
      />
    );
  const data = task.data;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={`/engagements/${data.engagement.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {data.engagement.client.name} — {data.engagement.natureOfWork}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <div className="flex items-center gap-2">
            <SubTaskStatusBadge status={data.status} />
            <EngagementStatusBadge status={data.engagement.status} />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="whitespace-pre-wrap break-words text-sm">
                {data.description || (
                  <span className="text-muted-foreground">No description was added for this task.</span>
                )}
              </p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-muted-foreground"><UserRound className="size-4" />Assigned to</dt>
                  <dd className="font-medium">{data.assignedTo.name}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-muted-foreground"><Flag className="size-4" />Priority</dt>
                  <dd className="font-medium">{data.priority ?? "MEDIUM"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-4" />Due date</dt>
                  <dd><Deadline date={data.dueDate} complete={data.status === "DONE"} /></dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">{data.status === "DONE" ? "Completed" : "Created"}</dt>
                  <dd className="font-medium">
                    {data.status === "DONE"
                      ? data.completedAt ? formatDateTime(data.completedAt) : "Completed"
                      : formatDateTime(data.createdAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Progress className="flex-1" value={data.progress} aria-label="Task progress" />
                <span className="text-sm tabular-nums">{data.progress}%</span>
              </div>
              <SubTaskStatusControl task={data} />
            </CardContent>
          </Card>

          {engagement.data ? (
            <CommentThread key={data.id} engagement={engagement.data} taskId={data.id} />
          ) : (
            <QueryState loading={engagement.isLoading} error={engagement.error} retry={() => void engagement.refetch()} />
          )}
        </div>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.isLoading && <p className="text-sm text-muted-foreground">Loading history…</p>}
              {activity.error && <p role="alert" className="text-sm text-destructive">Could not load history.</p>}
              {activity.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">No recorded changes yet.</p>
              )}
              {!!activity.data?.length && <ActivityTimeline entries={activity.data} />}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
