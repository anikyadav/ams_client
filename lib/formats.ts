import { adToBs } from "@/lib/nepali-date";
import type { EngagementStatus, SubTaskStatus } from "@/lib/types";

export const engagementStatusLabel: Record<EngagementStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  UNDER_REVIEW: "Under review",
  COMPLETE: "Complete",
  DELIVERED: "Delivered",
};

export const subTaskStatusLabel: Record<SubTaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const engagementBadgeClass: Record<EngagementStatus, string> = {
  NOT_STARTED:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  UNDER_REVIEW:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  COMPLETE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  DELIVERED:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
};

const subTaskBadgeClass: Record<SubTaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function engagementBadge(status: EngagementStatus): string {
  return engagementBadgeClass[status];
}

export function subTaskBadge(status: SubTaskStatus): string {
  return subTaskBadgeClass[status];
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return `${adToBs(value)} BS`;
  } catch {
    return "Date outside supported BS range";
  }
}

export function formatDateTime(value: string): string {
  return `${formatDate(value)} ${new Date(value).toLocaleTimeString("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit" })} NPT`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
