import { isOverdue, nepalToday } from "@/lib/project-tracking";
import type { SubTask } from "@/lib/types";

type TaskPriority = NonNullable<SubTask["priority"]>;

export const priorityColors: Record<TaskPriority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-primary",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-rose-600 dark:text-rose-400",
};

export type QuickFilter =
  | "mine"
  | "open"
  | "overdue"
  | "week"
  | "blocked"
  | "review";

export const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "mine", label: "Only mine" },
  { id: "open", label: "Open" },
  { id: "overdue", label: "Overdue" },
  { id: "week", label: "Due this week" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Needs review" },
];

export function matchesQuickFilter(
  task: SubTask,
  filter: QuickFilter,
  userId: string | undefined,
) {
  const done = task.status === "DONE";
  if (filter === "mine") return task.assignedToId === userId;
  if (filter === "open") return !done;
  if (filter === "overdue") return isOverdue(task.dueDate, done);
  if (filter === "blocked") return !done && !!task.blockedReason;
  if (filter === "review") return task.reviewState === "SUBMITTED";
  if (done || !task.dueDate) return false;
  const today = nepalToday();
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const due = task.dueDate.slice(0, 10);
  return due >= today && due <= end.toISOString().slice(0, 10);
}

export type ReviewBadge = { label: string; tone: string };

/** Sign-off status of a task, shown next to its title; null when nothing is worth saying. */
export function reviewBadge(task: SubTask): ReviewBadge | null {
  switch (task.reviewState) {
    case "SUBMITTED":
      return {
        label: "Awaiting review",
        tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
      };
    case "CHANGES_REQUESTED":
      return {
        label: "Changes requested",
        tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
      };
    case "APPROVED":
      return task.status === "DONE"
        ? {
            label: "Approved",
            tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
          }
        : null;
    default:
      return null;
  }
}

export function checklistCount(task: SubTask) {
  const items = task.checklist ?? [];
  return { done: items.filter((item) => item.done).length, total: items.length };
}
