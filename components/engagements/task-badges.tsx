import { Ban, ListChecks } from "lucide-react";
import { checklistCount, reviewBadge } from "@/lib/task-ui";
import { cn } from "@/lib/utils";
import type { SubTask } from "@/lib/types";

/** Small status chips for a task: sign-off state, blocker and checklist progress. */
export function TaskBadges({ task }: { task: SubTask }) {
  const review = reviewBadge(task);
  const steps = checklistCount(task);
  const blocked = task.status !== "DONE" && !!task.blockedReason;
  if (!review && !blocked && !steps.total) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {review && (
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", review.tone)}>
          {review.label}
        </span>
      )}
      {blocked && (
        <span
          title={task.blockedReason ?? undefined}
          className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
        >
          <Ban className="size-3" aria-hidden="true" />
          Blocked
          <span className="sr-only">: {task.blockedReason}</span>
        </span>
      )}
      {steps.total > 0 && (
        <span
          title={`${steps.done} of ${steps.total} steps done`}
          className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          <ListChecks className="size-3" aria-hidden="true" />
          {steps.done}/{steps.total}
          <span className="sr-only"> steps done</span>
        </span>
      )}
    </span>
  );
}
