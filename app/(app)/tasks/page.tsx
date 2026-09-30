"use client";

import Link from "next/link";
import { EngagementProgressControl } from "@/components/engagements/engagement-progress-control";
import { TaskDiscussion } from "@/components/engagements/task-discussion";
import { useAuth } from "@/components/providers/auth-provider";
import { useEngagements } from "@/lib/hooks";
import { canViewEngagement } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { EngagementStatusBadge } from "@/components/shared/status-badge";
import { SubTaskStatusControl } from "@/components/engagements/subtask-status-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function MyWorkPage() {
  const { user } = useAuth();
  const query = useEngagements();
  const engagements = user
    ? (query.data ?? []).filter((item) => canViewEngagement(user, item))
    : [];
  return (
    <div className="space-y-6">
      <PageHeader
        title="My work"
        description="Your engagements and assigned sub-tasks for the selected fiscal year. Open an engagement to see its full context and discussion."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!query.isLoading && !query.error && engagements.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No engagements assigned to you yet.
        </p>
      )}
      {!query.error &&
        engagements.map((engagement) => {
          const tasks = engagement.subTasks.filter(
            (task) => task.assignedToId === user?.id,
          );
          return (
            <Card key={engagement.id}>
              <CardHeader>
                <CardTitle>
                  <Link
                    className="hover:underline"
                    href={`/engagements/${engagement.id}`}
                  >
                    {engagement.client.name} — {engagement.natureOfWork}
                  </Link>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <EngagementStatusBadge status={engagement.status} />
                  <span>Primary staff: {engagement.staff.name}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm">
                    Overall progress: {engagement.progress}%
                  </p>
                  <Progress
                    value={engagement.progress}
                    aria-label="Engagement progress"
                  />
                </div>
                <EngagementProgressControl engagement={engagement} />
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No sub-tasks assigned to you. The primary staff member can update the engagement directly above.
                  </p>
                )}
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
                  >
                    <Link
                      className="text-sm hover:underline"
                      href={`/engagements/${engagement.id}#subtask-${task.id}`}
                    >
                      {task.title}
                    </Link>
                    <div className="w-full sm:w-72">
                      <SubTaskStatusControl task={task} />
                      <TaskDiscussion engagement={engagement} task={task} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
