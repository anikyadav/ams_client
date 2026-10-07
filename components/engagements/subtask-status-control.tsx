"use client";

import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { SubTaskStatusBadge } from "@/components/shared/status-badge";
import { SubTaskMilestoneControl } from "@/components/engagements/subtask-milestone-control";
import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage } from "@/lib/api";
import { useUpdateSubTask } from "@/lib/hooks";
import { canUpdateSubTask } from "@/lib/permissions";
import { SUBTASK_STATUS_OPTIONS } from "@/lib/schemas";
import { subTaskStatusLabel } from "@/lib/formats";
import type { SubTask, SubTaskStatus } from "@/lib/types";

/**
 * One status dropdown for everyone allowed to update the task. The `detailed`
 * variant adds the staff milestone/update form used inside the task drawer.
 */
export function SubTaskStatusControl({
  task,
  detailed = false,
  compact = false,
}: {
  task: SubTask;
  detailed?: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const update = useUpdateSubTask();
  if (task.checklist?.length)
    return (
      <div className="space-y-1">
        <SubTaskStatusBadge status={task.status} />
        {detailed && <p className="text-xs text-muted-foreground">Progress follows completed activities. Complete every activity to finish this sub-task.</p>}
      </div>
    );
  if (!user || !canUpdateSubTask(user, task))
    return <SubTaskStatusBadge status={task.status} />;
  if (detailed && user.role === "STAFF")
    return <SubTaskMilestoneControl task={task} />;
  return (
    <NativeSelect
      aria-label={`Status for ${task.title}`}
      className={compact ? "h-9 w-auto min-w-32 md:h-8" : undefined}
      value={task.status}
      disabled={update.isPending}
      onChange={async (event) => {
        try {
          await update.mutateAsync({
            id: task.id,
            payload: { status: event.target.value as SubTaskStatus },
          });
          toast.success("Sub-task status updated");
        } catch (error) {
          toast.error(apiErrorMessage(error));
        }
      }}
    >
      {SUBTASK_STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {subTaskStatusLabel[status]}
        </option>
      ))}
    </NativeSelect>
  );
}
