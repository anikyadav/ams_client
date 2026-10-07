"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EngagementStatusBadge } from "@/components/shared/status-badge";
import { HealthChip } from "@/components/shared/health-chip";
import { apiErrorMessage } from "@/lib/api";
import { useReviewSubTask, useUpdateEngagement } from "@/lib/hooks";
import { collectTasks, taskHref } from "@/components/work/collect";
import { formatDateTime } from "@/lib/formats";
import { isRequiredTask } from "@/lib/required-tasks";
import type { Engagement, EngagementStatus } from "@/lib/types";

/** Open engagements whose compulsory tasks are all approved but have not been sent for review yet. */
export function readyForReview(engagement: Engagement) {
  if (engagement.status !== "NOT_STARTED" && engagement.status !== "IN_PROGRESS") return false;
  const required = engagement.subTasks.filter(isRequiredTask);
  return (
    required.length > 0 &&
    required.every((task) => task.reviewState === "APPROVED")
  );
}

/** Auditor review queue: what is waiting for a decision. */
export function WorkReview({ engagements }: { engagements: Engagement[] }) {
  const update = useUpdateEngagement();
  const reviewing = engagements.filter((item) => item.status === "UNDER_REVIEW");
  const ready = engagements.filter(readyForReview);
  const reviewTask = useReviewSubTask();
  const submitted = collectTasks(engagements)
    .filter(({ task }) => task.reviewState === "SUBMITTED")
    .sort((a, b) =>
      (a.task.submittedAt ?? "").localeCompare(b.task.submittedAt ?? ""),
    );

  async function approve(id: string) {
    try {
      await reviewTask.mutateAsync({ id, decision: "APPROVE" });
      toast.success("Task approved");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function move(engagement: Engagement, status: EngagementStatus, message: string) {
    try {
      await update.mutateAsync({ id: engagement.id, payload: { status } });
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  const list = (
    items: Engagement[],
    label: string,
    empty: string,
    action: (engagement: Engagement) => React.ReactNode,
  ) => (
    <section aria-label={label} className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {label}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((engagement) => (
            <li
              key={engagement.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0 flex-1 basis-60 space-y-1">
                <Link href={`/engagements/${engagement.id}`} className="font-medium hover:underline">
                  {engagement.client.name}
                </Link>
                <p className="text-sm text-muted-foreground">{engagement.natureOfWork}</p>
                <p className="text-xs text-muted-foreground">Lead: {engagement.staff.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <EngagementStatusBadge status={engagement.status} />
                <HealthChip engagement={engagement} />
                <span className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  <Progress className="w-20" value={engagement.progress} aria-label={`Progress for ${engagement.natureOfWork}`} />
                  {engagement.progress}%
                </span>
                {action(engagement)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-8">
      <section aria-label="Tasks awaiting review" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          Tasks awaiting review
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {submitted.length}
          </span>
        </h3>
        {submitted.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No task is waiting for sign-off.
          </p>
        ) : (
          <ul className="space-y-2">
            {submitted.map((item) => (
              <li
                key={item.task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0 flex-1 basis-60 space-y-1">
                  <Link href={taskHref(item)} className="font-medium hover:underline">
                    {item.task.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.engagement.client.name} · {item.engagement.natureOfWork}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted by {item.task.submittedBy?.name ?? item.task.assignedTo.name}
                    {item.task.submittedAt ? ` on ${formatDateTime(item.task.submittedAt)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={reviewTask.isPending}
                    aria-label={`Approve ${item.task.title}`}
                    onClick={() => void approve(item.task.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={taskHref(item)} />}
                  >
                    Review…
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {list(
        reviewing,
        "Under review",
        "Nothing is waiting for review.",
        (engagement) => (
          <Button
            size="sm"
            disabled={update.isPending}
            onClick={() => void move(engagement, "COMPLETE", "Marked complete")}
          >
            Mark complete
          </Button>
        ),
      )}
      {list(
        ready,
        "Ready for review",
        "No engagement has all compulsory tasks done and is still waiting to be sent for review.",
        (engagement) => (
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() => void move(engagement, "UNDER_REVIEW", "Sent for review")}
          >
            Send to review
          </Button>
        ),
      )}
    </div>
  );
}
