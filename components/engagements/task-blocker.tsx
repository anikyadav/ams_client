"use client";

import { useState, type FormEvent } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/formats";
import { useUpdateSubTask } from "@/lib/hooks";
import { canUpdateSubTask } from "@/lib/permissions";
import type { SubTask } from "@/lib/types";

/** Flag that a task cannot move until something outside the team happens. */
export function TaskBlocker({ task }: { task: SubTask }) {
  const { user } = useAuth();
  const update = useUpdateSubTask();
  const [reason, setReason] = useState("");
  if (task.status === "DONE" || !user || !canUpdateSubTask(user, task)) return null;

  async function save(blockedReason: string | null) {
    try {
      await update.mutateAsync({ id: task.id, payload: { blockedReason } });
      setReason("");
      toast.success(blockedReason ? "Task marked as blocked" : "Task unblocked");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim()) void save(reason.trim());
  }

  return (
    <section aria-label="Blocker" className="space-y-2 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Ban className="size-4" aria-hidden="true" />
        Blocker
      </h3>
      {task.blockedReason ? (
        <>
          <p className="text-sm">
            <strong>Blocked:</strong> {task.blockedReason}
            {task.blockedAt && (
              <span className="block text-xs text-muted-foreground">
                since {formatDateTime(task.blockedAt)}
              </span>
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() => void save(null)}
          >
            Mark as unblocked
          </Button>
        </>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            aria-label="Why is this task blocked?"
            placeholder="Waiting on… (e.g. client's bank letter)"
            maxLength={300}
            value={reason}
            disabled={update.isPending}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={update.isPending || !reason.trim()}>
            Mark blocked
          </Button>
        </form>
      )}
    </section>
  );
}
