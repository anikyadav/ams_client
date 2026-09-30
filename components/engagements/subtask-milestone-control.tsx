"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { useUpdateSubTask } from "@/lib/hooks";
import {
  SUBTASK_MILESTONES,
  type SubTaskMilestone,
} from "@/lib/milestones";
import { cn } from "@/lib/utils";
import type { SubTask } from "@/lib/types";

export function SubTaskMilestoneControl({ task }: { task: SubTask }) {
  const update = useUpdateSubTask();
  const [comment, setComment] = useState("");
  const active: SubTaskMilestone | null = SUBTASK_MILESTONES.includes(
    task.progress as SubTaskMilestone,
  )
    ? (task.progress as SubTaskMilestone)
    : task.status === "DONE"
      ? 100
      : null;
  const selected = active ?? (task.status === "IN_PROGRESS" ? 25 : null);
  const pending = update.isPending;

  const handleChange = (milestone: SubTaskMilestone) => {
    update.mutate(
      { id: task.id, payload: { progress: milestone, ...(comment.trim() ? { comment: comment.trim() } : {}) } },
      {
        onSuccess: () => {
          setComment("");
          toast.success(
            milestone === 100
              ? "Task marked as complete"
              : `Task progress set to ${milestone}%`,
          );
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    );
  };

  return (
    <div className="space-y-1.5">
      <Textarea aria-label={`Update comment for ${task.title}`} placeholder="Add context before choosing a milestone (optional)" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} disabled={pending} rows={2} />
      <div
        role="radiogroup"
        aria-label={`Milestone for ${task.title}`}
        className="flex w-full items-center gap-0.5 rounded-lg border border-input bg-background p-0.5"
      >
        {SUBTASK_MILESTONES.map((milestone) => {
          const checked = selected === milestone;
          return (
            <label
              key={milestone}
              className={cn(
                "relative flex flex-1 cursor-pointer items-center justify-center rounded-md px-1 py-1.5 text-center text-xs font-medium transition-colors",
                checked
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
                pending && "cursor-wait opacity-60",
              )}
            >
              <input
                type="radio"
                name={`milestone-${task.id}`}
                value={milestone}
                checked={checked}
                disabled={pending}
                aria-label={`${milestone}%`}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={() => void handleChange(milestone)}
              />
              {milestone}%
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {task.status === "DONE"
          ? "Complete"
          : task.status === "IN_PROGRESS"
            ? `In progress · ${selected}%`
            : "Not started"}
      </p>
    </div>
  );
}