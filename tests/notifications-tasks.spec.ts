import { test, expect, type Page } from "@playwright/test";
import type { ActivityEntry, AppNotification, Engagement, SubTaskDetail, User } from "../lib/types";

const staff: User = {
  id: "staff",
  name: "Staff One",
  email: "staff@test.example",
  role: "STAFF",
  createdAt: "2026-09-01T00:00:00Z",
};
const auditor: User = { ...staff, id: "auditor", name: "Auditor", email: "auditor@test.example", role: "AUDITOR" };
const client = {
  fiscalYearId: "fy83",
  lineageId: "client",
  id: "client",
  name: "Example Client",
  createdAt: staff.createdAt,
};
const baseTask = {
  engagementId: "job",
  description: "Collect and tick the bank confirmations.",
  priority: "HIGH" as const,
  dueDate: null,
  assignedToId: staff.id,
  assignedTo: staff,
  createdAt: staff.createdAt,
};
const openTask = { ...baseTask, id: "open", title: "Open review", status: "IN_PROGRESS" as const, progress: 50 };
const doneTask = {
  ...baseTask,
  id: "done",
  title: "Finished review",
  status: "DONE" as const,
  progress: 100,
  completedAt: "2026-09-10T06:00:00Z",
};
const engagement: Engagement = {
  id: "job",
  fiscalYearId: "fy83",
  clientId: client.id,
  client,
  natureOfWork: "Annual audit",
  status: "IN_PROGRESS",
  staffId: "someone-else",
  staff: { ...staff, id: "someone-else", name: "Lead Staff" },
  startDate: null,
  targetDate: null,
  priority: "High",
  createdAt: staff.createdAt,
  progress: 75,
  comments: [],
  subTasks: [openTask, doneTask],
};
const activity: ActivityEntry[] = [
  {
    id: "a1",
    engagementId: "job",
    subTaskId: "open",
    action: "SUBTASK_UPDATED",
    summary: 'Sub-task "Open review": status TODO → IN_PROGRESS.',
    createdAt: "2026-09-09T06:00:00Z",
    actor: staff,
    engagement: { id: "job", natureOfWork: "Annual audit", client: { name: client.name } },
  },
];

async function mockApi(page: Page, notifications: AppNotification[]) {
  const reads: string[] = [];
  await page.route("http://localhost:5000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204 });
    const respond = (json: unknown) => route.fulfill({ status: 200, json });
    if (path === "/health/ready") return respond({ status: "ok" });
    if (path === "/auth/login")
      return respond({ accessToken: "t", tokenType: "Bearer", expiresIn: 3600, user: staff });
    if (path === "/auth/me") return respond(staff);
    if (path === "/fiscal-years")
      return respond([{ id: "fy83", startDate: "2026-07-17", endDate: "2027-07-17" }]);
    if (path === "/engagements") return respond([engagement]);
    if (path === "/engagements/job") return respond(engagement);
    if (path === "/notifications") {
      const unread = notifications.filter((item) => !item.readAt).length;
      return respond({ items: notifications, unreadCount: unread });
    }
    if (path === "/notifications/read-all" || /^\/notifications\/.+\/read$/.test(path)) {
      reads.push(path);
      for (const item of notifications) item.readAt = "2026-09-11T00:00:00Z";
      return route.fulfill({ status: 204 });
    }
    if (path === "/activity/mine") return respond(activity);
    if (path === "/subtasks/open/activity") return respond(activity);
    if (path === "/subtasks/open") {
      const detail: SubTaskDetail = {
        ...openTask,
        engagement: {
          id: "job",
          natureOfWork: engagement.natureOfWork,
          status: engagement.status,
          staffId: engagement.staffId,
          client: { id: client.id, name: client.name },
        },
      };
      return respond(detail);
    }
    return route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  return { reads };
}

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(staff.email);
  await page.getByLabel("Password", { exact: true }).fill("Test-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
}

test("notification bell shows unread items, opens the linked task and marks it read", async ({ page }) => {
  const { reads } = await mockApi(page, [
    {
      id: "n1",
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: '"Open review"',
      engagementId: "job",
      subTaskId: "open",
      readAt: null,
      createdAt: "2026-09-09T06:00:00Z",
    },
  ]);
  await signIn(page);
  const bell = page.getByRole("button", { name: "Notifications, 1 unread" });
  await expect(bell).toBeVisible();
  await bell.click();
  await page.getByRole("link", { name: /New task assigned/ }).click();
  await expect(page).toHaveURL(/\/engagements\/job\?task=open$/);
  await expect(page.getByRole("heading", { name: "Open review" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(reads).toEqual(["/notifications/n1/read"]);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});

test("task drawer shows details and the task's history; old task links redirect to it", async ({ page }) => {
  await mockApi(page, []);
  await signIn(page);
  await page.goto("/tasks/open");
  await expect(page).toHaveURL(/\/engagements\/job\?task=open$/);
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "Open review" })).toBeVisible();
  await expect(drawer.getByText("Collect and tick the bank confirmations.")).toBeVisible();
  await drawer.getByRole("tab", { name: /Discussion & activity/ }).click();
  await expect(drawer.getByText(/status Not started → In progress/)).toBeVisible();
});

test("staff My work separates assigned and completed tasks and shows their activity", async ({ page }) => {
  await mockApi(page, []);
  await signIn(page);
  await expect(page.getByText("Open tasks", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("link", { name: "Finished review" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open review" })).toHaveCount(0);
  await page.getByRole("button", { name: "My activity", exact: true }).click();
  await expect(page.getByText(/status Not started → In progress/)).toBeVisible();
});
