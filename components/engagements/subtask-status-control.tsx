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

export function SubTaskStatusControl({ task }: { task: SubTask }) {
  const { user } = useAuth();
  const update = useUpdateSubTask();
  if (!user || !canUpdateSubTask(user, task))
    return <SubTaskStatusBadge status={task.status} />;
  if (user.role === "STAFF") return <SubTaskMilestoneControl task={task} />;
  return (
    <NativeSelect
      aria-label={`Status for ${task.title}`}
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
