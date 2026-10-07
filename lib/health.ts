import { isClosedStatus, nepalToday } from "@/lib/project-tracking";
import type { Engagement } from "@/lib/types";

export type HealthLevel = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
export type Health = { level: HealthLevel; reasons: string[] };

export const healthLabel: Record<HealthLevel, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
};

const DAY = 86_400_000;
const daysFrom = (today: string, date: string) =>
  Math.round(
    (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${today}T00:00:00Z`)) /
      DAY,
  );
const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Derived, not stored: a traffic light for an open engagement based on its
 * target date and sub-task deadlines. Closed engagements have no health.
 */
export function engagementHealth(
  engagement: Engagement,
  now = new Date(),
): Health | null {
  if (isClosedStatus(engagement.status)) return null;
  const today = nepalToday(now);
  const open = engagement.subTasks.filter((task) => task.status !== "DONE");
  const overdueTasks = open.filter(
    (task) => task.dueDate && daysFrom(today, task.dueDate) < 0,
  ).length;
  const soonTasks = open.filter((task) => {
    if (!task.dueDate) return false;
    const days = daysFrom(today, task.dueDate);
    return days >= 0 && days <= 3;
  }).length;
  const blockedTasks = open.filter((task) => task.blockedReason).length;
  const targetDays = engagement.targetDate
    ? daysFrom(today, engagement.targetDate)
    : null;

  const off: string[] = [];
  if (targetDays !== null && targetDays < 0)
    off.push(`Target date passed ${plural(-targetDays, "day")} ago`);
  if (overdueTasks) off.push(`${plural(overdueTasks, "overdue task")}`);
  if (off.length) return { level: "OFF_TRACK", reasons: off };

  const risk: string[] = [];
  if (targetDays !== null && targetDays <= 7 && engagement.progress < 75)
    risk.push(
      `Target in ${plural(targetDays, "day")} with ${engagement.progress}% progress`,
    );
  if (soonTasks) risk.push(`${plural(soonTasks, "task")} due within 3 days`);
  if (blockedTasks) risk.push(`${plural(blockedTasks, "blocked task")}`);
  if (risk.length) return { level: "AT_RISK", reasons: risk };

  return { level: "ON_TRACK", reasons: ["No overdue or imminent deadlines"] };
}
