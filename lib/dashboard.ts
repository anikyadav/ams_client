import type {
  Client,
  Engagement,
  EngagementStatus,
  SubTaskStatus,
  User,
} from "./types";
import { canViewEngagement } from "./permissions";

export const stages: EngagementStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "COMPLETE",
  "DELIVERED",
];
export type DashboardFilter =
  "OPEN" | "OVERDUE" | "DUE_SOON" | "NO_TARGET" | EngagementStatus;
export const isOpen = (item: Engagement) =>
  item.status !== "COMPLETE" && item.status !== "DELIVERED";

export function summarizeDashboard(
  engagements: Engagement[],
  clients: Client[],
  user: Pick<User, "id" | "role">,
  fiscalYearId: string,
  now: Date,
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const weekEnd = end.toISOString().slice(0, 10);
  const list = engagements.filter(
    (item) =>
      item.fiscalYearId === fiscalYearId && canViewEngagement(user, item),
  );
  const byStage = Object.fromEntries(
    stages.map((stage) => [
      stage,
      list.filter((item) => item.status === stage).length,
    ]),
  ) as Record<EngagementStatus, number>;
  const open = list.filter(isOpen);
  const overdue = open.filter(
    (item) => item.targetDate && item.targetDate.slice(0, 10) < today,
  );
  const dueSoon = open.filter(
    (item) =>
      item.targetDate &&
      item.targetDate.slice(0, 10) >= today &&
      item.targetDate.slice(0, 10) <= weekEnd,
  );
  const noTarget = open.filter((item) => !item.targetDate);
  const clientIds = new Set(list.map((item) => item.clientId));
  const yearlyClients = clients.filter(
    (item) => item.fiscalYearId === fiscalYearId,
  );
  const tasks = list
    .flatMap((item) => item.subTasks)
    .filter((task) => user.role === "AUDITOR" || task.assignedToId === user.id);
  const byTask = Object.fromEntries(
    (["TODO", "IN_PROGRESS", "DONE"] as SubTaskStatus[]).map((status) => [
      status,
      tasks.filter((task) => task.status === status).length,
    ]),
  ) as Record<SubTaskStatus, number>;
  return {
    today,
    list,
    byStage,
    open,
    overdue,
    dueSoon,
    noTarget,
    byTask,
    clientCount:
      user.role === "AUDITOR" ? yearlyClients.length : clientIds.size,
    clientsWithoutWork: yearlyClients.filter(
      (client) => !clientIds.has(client.id),
    ).length,
    taskCount: tasks.length,
    taskProgress: tasks.length
      ? Math.round(
          tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length,
        )
      : 0,
    completed: byStage.COMPLETE + byStage.DELIVERED,
  };
}

export function dashboardQueue(
  summary: ReturnType<typeof summarizeDashboard>,
  filter: DashboardFilter,
) {
  const items =
    filter === "OPEN"
      ? summary.open
      : filter === "OVERDUE"
        ? summary.overdue
        : filter === "DUE_SOON"
          ? summary.dueSoon
          : filter === "NO_TARGET"
            ? summary.noTarget
            : summary.list.filter((item) => item.status === filter);
  return [...items].sort(
    (a, b) =>
      (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999") ||
      a.client.name.localeCompare(b.client.name) ||
      a.id.localeCompare(b.id),
  );
}
