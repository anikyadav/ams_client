import { test, expect } from "@playwright/test";
import { summarizeDashboard, dashboardQueue } from "../lib/dashboard";
import type { Client, Engagement, User } from "../lib/types";

const user: User = {
  id: "staff",
  name: "Staff",
  email: "staff@test.example",
  role: "STAFF",
  createdAt: "2026-01-01",
};
const client: Client = {
  id: "client",
  fiscalYearId: "year",
  lineageId: "client",
  name: "Client",
  createdAt: "2026-01-01",
};
const job = (
  id: string,
  status: Engagement["status"],
  targetDate: string | null,
  extra: Partial<Engagement> = {},
): Engagement => ({
  id,
  status,
  targetDate,
  fiscalYearId: "year",
  clientId: client.id,
  client,
  staffId: user.id,
  staff: user,
  natureOfWork: id,
  startDate: null,
  priority: null,
  createdAt: "2026-01-01",
  progress: 0,
  subTasks: [],
  comments: [],
  ...extra,
});

test("dashboard counts yearly clients without work and classifies targets at Nepal midnight", () => {
  const jobs = [
    job("late", "IN_PROGRESS", "2026-09-18"),
    job("today", "UNDER_REVIEW", "2026-09-19"),
    job("week", "NOT_STARTED", "2026-09-26"),
    job("later", "NOT_STARTED", "2026-09-27"),
    job("no-date", "NOT_STARTED", null),
    job("complete", "COMPLETE", "2026-01-01"),
    job("delivered", "DELIVERED", "2026-01-01"),
    job("other-year", "IN_PROGRESS", "2026-01-01", { fiscalYearId: "other" }),
  ];
  const result = summarizeDashboard(
    jobs,
    [
      client,
      { ...client, id: "no-work" },
      { ...client, id: "outside", fiscalYearId: "other" },
    ],
    { ...user, role: "AUDITOR" },
    "year",
    new Date("2026-09-18T18:15:00Z"),
  );
  expect(result.today).toBe("2026-09-19");
  expect(result.clientCount).toBe(2);
  expect(result.clientsWithoutWork).toBe(1);
  expect(result.list).toHaveLength(7);
  expect(result.completed).toBe(2);
  expect(result.overdue.map((item) => item.id)).toEqual(["late"]);
  expect(result.dueSoon.map((item) => item.id)).toEqual(["today", "week"]);
  expect(result.noTarget.map((item) => item.id)).toEqual(["no-date"]);
  expect(dashboardQueue(result, "OPEN").map((item) => item.id)).toEqual([
    "late",
    "today",
    "week",
    "later",
    "no-date",
  ]);
});

test("staff totals exclude inaccessible work and count only their own tasks", () => {
  const task = {
    id: "task",
    engagementId: "visible",
    title: "Task",
    description: null,
    status: "DONE" as const,
    progress: 100,
    assignedToId: user.id,
    assignedTo: user,
    createdAt: "2026-01-01",
  };
  const jobs = [
    job("visible", "IN_PROGRESS", null, {
      staffId: "other",
      subTasks: [
        task,
        {
          ...task,
          id: "other-task",
          status: "TODO" as const,
          progress: 0,
          assignedToId: "other",
        },
      ],
    }),
    job("hidden", "IN_PROGRESS", null, {
      staffId: "other",
      clientId: "hidden-client",
    }),
  ];
  const result = summarizeDashboard(
    jobs,
    [client],
    user,
    "year",
    new Date("2026-09-19"),
  );
  expect(result.list).toHaveLength(1);
  expect(result.clientCount).toBe(1);
  expect(result.taskCount).toBe(1);
  expect(result.taskProgress).toBe(100);
  const empty = summarizeDashboard(
    jobs,
    [client],
    user,
    "empty-year",
    new Date("2026-09-19"),
  );
  expect(empty.list).toEqual([]);
  expect(empty.clientCount).toBe(0);
  expect(empty.taskProgress).toBe(0);
});
