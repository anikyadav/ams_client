"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { stages } from "@/lib/dashboard";
import { engagementStatusLabel } from "@/lib/formats";
import { useUpdateEngagement } from "@/lib/hooks";
import { isRequiredTask } from "@/lib/required-tasks";
import { cn } from "@/lib/utils";
import type { Engagement } from "@/lib/types";

/** The engagement's five stages as a stepper. Auditors can move it by clicking a stage. */
export function StatusStepper({
  engagement,
  editable,
}: {
  engagement: Engagement;
  editable: boolean;
}) {
  const update = useUpdateEngagement();
  const current = stages.indexOf(engagement.status);
  // Delivery needs every compulsory task signed off (the server enforces it too).
  const unsigned = engagement.subTasks.filter(
    (task) => isRequiredTask(task) && task.reviewState !== "APPROVED",
  ).length;
  const incomplete = engagement.subTasks.some((task) => task.status !== "DONE");
  return (
    <ol aria-label="Engagement stage" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {stages.map((stage, index) => {
        const active = index === current;
        const done = index < current;
        const body = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary ring-2 ring-primary/25",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" /> : index + 1}
            </span>
            {engagementStatusLabel[stage]}
          </>
        );
        const automatic = engagement.subTasks.length > 0 && ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"].includes(stage);
        const gated = stage === "DELIVERED" && (unsigned > 0 || incomplete);
        const cls = cn(
          "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        );
        return (
          <li key={stage} className="flex items-center gap-1" aria-current={active ? "step" : undefined}>
            {editable ? (
              <button
                type="button"
                disabled={update.isPending || active || gated || automatic}
                title={
                  automatic
                    ? "This stage follows sub-task completion automatically"
                    : gated
                      ? incomplete
                        ? "Complete every sub-task before delivery"
                        : `${unsigned} compulsory ${unsigned === 1 ? "task needs" : "tasks need"} approval first`
                      : undefined
                }
                aria-label={`Set stage to ${engagementStatusLabel[stage]}`}
                className={cn(cls, "transition-colors hover:bg-muted disabled:hover:bg-transparent")}
                onClick={async () => {
                  try {
                    await update.mutateAsync({ id: engagement.id, payload: { status: stage } });
                    toast.success(`Stage set to ${engagementStatusLabel[stage]}`);
                  } catch (error) {
                    toast.error(apiErrorMessage(error));
                  }
                }}
              >
                {body}
              </button>
            ) : (
              <span className={cls}>{body}</span>
            )}
            {index < stages.length - 1 && (
              <span aria-hidden="true" className={cn("h-px w-4 sm:w-6", done ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
