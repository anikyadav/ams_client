"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { apiErrorMessage } from "@/lib/api";
import {
  useAddChecklistItem,
  useRemoveChecklistItem,
  useUpdateChecklistItem,
} from "@/lib/hooks";
import { canUpdateSubTask } from "@/lib/permissions";
import { checklistCount } from "@/lib/task-ui";
import { cn } from "@/lib/utils";
import type { SubTask } from "@/lib/types";

/** Steps inside a task. Ticking them moves the task's progress; the last one submits it. */
export function TaskChecklist({ task }: { task: SubTask }) {
  const { user } = useAuth();
  const add = useAddChecklistItem();
  const update = useUpdateChecklistItem();
  const remove = useRemoveChecklistItem();
  const [text, setText] = useState("");
  const items = task.checklist ?? [];
  const { done, total } = checklistCount(task);
  const auditor = user?.role === "AUDITOR";
  const canTick = !!user && canUpdateSubTask(user, task);
  if (!total && !auditor) return null;

  async function run(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      if (message) toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    await run(() => add.mutateAsync({ taskId: task.id, text: value }));
    setText("");
  }

  return (
    <section aria-label="Checklist" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Steps</h3>
        {total > 0 && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Progress className="w-24" value={(done / total) * 100} aria-label="Steps completed" />
            {done}/{total}
          </span>
        )}
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Ticking steps moves the task forward. Completing the last step submits the task for
          review.
        </p>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
          >
            <input
              id={`step-${item.id}`}
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--primary)]"
              checked={item.done}
              disabled={!canTick || update.isPending}
              onChange={(event) =>
                void run(() =>
                  update.mutateAsync({ id: item.id, payload: { done: event.target.checked } }),
                )
              }
            />
            <label
              htmlFor={`step-${item.id}`}
              className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}
            >
              {item.text}
            </label>
            {auditor && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove step ${item.text}`}
                disabled={remove.isPending}
                onClick={() => void run(() => remove.mutateAsync(item.id))}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {auditor && (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            aria-label="Add a step"
            placeholder="Add a step and press Enter"
            maxLength={300}
            value={text}
            disabled={add.isPending}
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={add.isPending || !text.trim()}>
            Add
          </Button>
        </form>
      )}
    </section>
  );
}
