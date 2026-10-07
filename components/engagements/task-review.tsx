"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/formats";
import { useReviewSubTask } from "@/lib/hooks";
import type { SubTask } from "@/lib/types";

/** Preparer → reviewer sign-off for one task, with who and when. */
export function TaskReviewPanel({ task }: { task: SubTask }) {
  const { user } = useAuth();
  const review = useReviewSubTask();
  const [note, setNote] = useState("");
  const state = task.reviewState ?? "NOT_SUBMITTED";
  const auditor = user?.role === "AUDITOR";

  async function decide(decision: "APPROVE" | "REQUEST_CHANGES") {
    if (decision === "REQUEST_CHANGES" && !note.trim()) {
      toast.error("Explain what needs to change");
      return;
    }
    try {
      await review.mutateAsync({
        id: task.id,
        decision,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setNote("");
      toast.success(decision === "APPROVE" ? "Task approved" : "Sent back for changes");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  if (state === "NOT_SUBMITTED" && task.status !== "DONE") return null;
  return (
    <section aria-label="Sign-off" className="space-y-3 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Sign-off
      </h3>
      {state === "SUBMITTED" && (
        <p className="text-sm">
          Submitted for review by <strong>{task.submittedBy?.name ?? "staff"}</strong>
          {task.submittedAt ? ` on ${formatDateTime(task.submittedAt)}` : ""}.
        </p>
      )}
      {state === "APPROVED" && (
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>
            Approved
            {task.reviewedBy ? (
              <>
                {" "}
                by <strong>{task.reviewedBy.name}</strong>
              </>
            ) : (
              " (completed before sign-off was required)"
            )}
            {task.reviewedAt ? ` on ${formatDateTime(task.reviewedAt)}` : ""}.
            {task.reviewNote && (
              <span className="mt-1 block text-muted-foreground">{task.reviewNote}</span>
            )}
          </span>
        </p>
      )}
      {state === "CHANGES_REQUESTED" && (
        <p className="flex items-start gap-2 text-sm">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>
            <strong>{task.reviewedBy?.name ?? "The reviewer"}</strong> asked for changes
            {task.reviewedAt ? ` on ${formatDateTime(task.reviewedAt)}` : ""}:
            <span className="mt-1 block whitespace-pre-wrap rounded-md bg-rose-50 p-2 dark:bg-rose-500/10">
              {task.reviewNote}
            </span>
          </span>
        </p>
      )}
      {auditor && state === "SUBMITTED" && (
        <div className="space-y-2">
          <Textarea
            aria-label="Review note"
            placeholder="Note for the preparer (required when asking for changes)"
            maxLength={2000}
            rows={2}
            value={note}
            disabled={review.isPending}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={review.isPending} onClick={() => void decide("APPROVE")}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={review.isPending}
              onClick={() => void decide("REQUEST_CHANGES")}
            >
              Request changes
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
