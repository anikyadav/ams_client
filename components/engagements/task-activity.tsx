"use client";

import { useSubTaskActivity } from "@/lib/hooks";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { QueryState } from "@/components/shared/query-state";

export function TaskActivity({ taskId }: { taskId: string }) {
  const activity = useSubTaskActivity(taskId);
  return (
    <section className="space-y-4 border-t pt-4" aria-label="Sub-task activity">
      <h3 className="text-sm font-semibold">Sub-task activity</h3>
      <p className="text-xs text-muted-foreground">
        Changes, progress and comments, with who made them and when.
      </p>
      <QueryState
        loading={activity.isLoading}
        error={activity.error}
        retry={() => void activity.refetch()}
      />
      {activity.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No recorded activity yet.
        </p>
      )}
      {!!activity.data?.length && <ActivityTimeline entries={activity.data} />}
    </section>
  );
}
