import { test, expect, type Page } from "@playwright/test";
import type { Client, Engagement, User } from "../lib/types";

const auditor: User = {
  id: "auditor",
  name: "Auditor",
  email: "auditor@test.example",
  role: "AUDITOR",
  createdAt: "2026-09-01T00:00:00Z",
};
const staff: User = {
  ...auditor,
  id: "staff",
  name: "Staff One",
  email: "staff@test.example",
  role: "STAFF",
};
const other: User = {
  ...staff,
  id: "other",
  name: "Staff Two",
  email: "other@test.example",
};
const initialClient: Client = {
  fiscalYearId: "fy83",
  lineageId: "client",
  id: "client",
  name: "Example Client",
  createdAt: auditor.createdAt,
};

async function mockApi(page: Page, primaryOnly = false) {
  const milestones = new Map<string, number>();
  let actor = auditor;
  let sequence = 0;
  const calls: {
    method: string;
    path: string;
    body: Record<string, unknown> | null;
    role: string;
    fiscalYear: string | undefined;
  }[] = [];
  const clients = [{ ...initialClient }];
  const engagements: Engagement[] = [
    {
      id: "job",
      fiscalYearId: "fy83",
      clientId: initialClient.id,
      client: initialClient,
      natureOfWork: "Annual audit",
      status: "NOT_STARTED",
      staffId: other.id,
      staff: other,
      startDate: "2026-09-01T00:00:00Z",
      targetDate: "2026-09-30T00:00:00Z",
      priority: "High",
      createdAt: auditor.createdAt,
      progress: 0,
      comments: [],
      subTasks: [
        {
          id: "own",
          engagementId: "job",
          title: "Assigned review",
          description: "Review evidence",
          status: "TODO",
          progress: 0,
          assignedToId: staff.id,
          assignedTo: staff,
          createdAt: auditor.createdAt,
        },
        {
          id: "others",
          engagementId: "job",
          title: "Other staff work",
          description: null,
          status: "TODO",
          progress: 0,
          assignedToId: other.id,
          assignedTo: other,
          createdAt: auditor.createdAt,
        },
      ],
    },
  ];
  if (primaryOnly) Object.assign(engagements[0], { staffId: staff.id, staff, subTasks: [] });
  engagements.push({
    ...engagements[0],
    id: "hidden",
    staffId: other.id,
    staff: other,
    natureOfWork: "Unassigned tax job",
    client: { ...initialClient, name: "Private client" },
    subTasks: [],
    comments: [],
  });
  await page.route("http://localhost:5000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    if (method === "OPTIONS") return route.fulfill({ status: 204 });
    calls.push({
      method,
      path,
      body,
      role: actor.role,
      fiscalYear: request.headers()["x-fiscal-year-id"],
    });
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data });
    const nextId = () => `created-${++sequence}`;
    if (path === "/health/ready") return respond({ status: "ok" });
    if (path === "/auth/login") {
      actor = body.email === staff.email ? staff : auditor;
      return respond({
        accessToken: "test-token",
        user: actor,
        tokenType: "Bearer",
        expiresIn: 3600,
      });
    }
    if (path === "/fiscal-years")
      return respond([
        { id: "fy83", startDate: "2026-07-17", endDate: "2027-07-17" },
        { id: "fy82", startDate: "2025-07-17", endDate: "2026-07-17" },
      ]);
    if (path === "/auth/me") return respond(actor);
    if (path === "/users") {
      if (actor.role !== "AUDITOR")
        return respond({ message: "Forbidden" }, 403);
      return respond(
        method === "GET" ? [staff, other] : { ...staff, ...body, id: nextId() },
      );
    }
    if (path.startsWith("/clients")) {
      if (actor.role !== "AUDITOR")
        return respond({ message: "Forbidden" }, 403);
      if (method === "GET") {
        const scoped = clients.filter(
          (client) =>
            client.fiscalYearId === request.headers()["x-fiscal-year-id"],
        );
        if (path === "/clients") return respond(scoped);
        const profile = scoped.find(
          (client) => client.id === path.split("/")[2],
        );
        return profile
          ? respond(profile)
          : respond({ message: "Resource not found" }, 404);
      }
      if (method === "POST") {
        const client = { ...initialClient, ...body, id: nextId() };
        clients.push(client);
        return respond(client);
      }
      const index = clients.findIndex(
        (client) => client.id === path.split("/")[2],
      );
      if (method === "PATCH") {
        Object.assign(clients[index], body);
        return respond(clients[index]);
      }
      clients.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    for (const engagement of engagements)
      engagement.progress = milestones.get(engagement.id) ?? (engagement.subTasks.length
        ? Math.round(
            engagement.subTasks.reduce((sum, task) => sum + task.progress, 0) /
              engagement.subTasks.length,
          )
        : 0);
    if (path === "/engagements") {
      if (method === "GET")
        return respond(
          engagements.filter(
            (job) =>
              job.fiscalYearId === request.headers()["x-fiscal-year-id"] &&
              (actor.role === "AUDITOR" ||
                job.staffId === actor.id ||
                job.subTasks.some((task) => task.assignedToId === actor.id)),
          ),
        );
      const job = {
        ...engagements[0],
        ...body,
        id: nextId(),
        client: clients.find((client) => client.id === body.clientId)!,
        staff: [staff, other].find((user) => user.id === body.staffId)!,
        subTasks: [],
        comments: [],
        progress: 0,
      };
      engagements.push(job);
      return respond(job);
    }
    const parts = path.split("/");
    const job = engagements.find((job) => job.id === parts[2]);
    if (parts[1] === "engagements" && job) {
      if (parts[3] === "subtasks") {
        const task = {
          ...body,
          id: nextId(),
          engagementId: job.id,
          status: "TODO" as const,
          progress: 0,
          assignedTo: [staff, other].find(
            (user) => user.id === body.assignedToId,
          )!,
          createdAt: auditor.createdAt,
        };
        job.subTasks.push(task as Engagement["subTasks"][number]);
        return respond(task);
      }
      if (parts[3] === "comments") {
        const comment = {
          ...body,
          id: nextId(),
          engagementId: job.id,
          subTaskId: null,
          author: actor,
          authorId: actor.id,
          createdAt: auditor.createdAt,
        };
        job.comments.push(comment as Engagement["comments"][number]);
        return respond(comment);
      }
      if (method === "PATCH" && parts[3] === "progress") {
        milestones.set(job.id, body.progress);
        job.progress = body.progress;
        job.status = body.progress === 100 ? "COMPLETE" : "IN_PROGRESS";
        return respond(job);
      }
      if (method === "PATCH") {
        Object.assign(job, body);
        return respond(job);
      }
      if (method === "DELETE") {
        engagements.splice(engagements.indexOf(job), 1);
        return route.fulfill({ status: 204 });
      }
      return respond(job);
    }
    if (parts[1] === "subtasks") {
      const parent = engagements.find((job) =>
        job.subTasks.some((task) => task.id === parts[2]),
      )!;
      const task = parent.subTasks.find((task) => task.id === parts[2])!;
      if (parts[3] === "comments") {
        const comment = {
          ...body,
          id: nextId(),
          engagementId: parent.id,
          subTaskId: task.id,
          author: actor,
          authorId: actor.id,
          createdAt: auditor.createdAt,
        };
        parent.comments.push(comment as Engagement["comments"][number]);
        return respond(comment);
      }
      if (method === "PATCH") {
        Object.assign(task, body);
        if (typeof body?.progress === "number")
          task.status =
            body.progress === 0
              ? "TODO"
              : body.progress === 100
                ? "DONE"
                : "IN_PROGRESS";
        else if (body?.status)
          task.progress = body.status === "DONE" ? 100 : body.status === "TODO" ? 0 : task.progress;
        return respond(task);
      }
      parent.subTasks = parent.subTasks.filter((item) => item.id !== task.id);
      return route.fulfill({ status: 204 });
    }
    if (parts[1] === "comments") {
      const parent = engagements.find((job) =>
        job.comments.some((comment) => comment.id === parts[2]),
      )!;
      const comment = parent.comments.find(
        (comment) => comment.id === parts[2],
      )!;
      if (method === "PATCH") {
        Object.assign(comment, body);
        return respond(comment);
      }
      parent.comments = parent.comments.filter(
        (item) => item.id !== comment.id,
      );
      return route.fulfill({ status: 204 });
    }
    return respond({ message: "Not found" }, 404);
  });
  return { calls, engagements };
}

async function login(page: Page, email = auditor.email) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    email === staff.email ? /\/tasks$/ : /\/dashboard$/,
  );
}

test("staff sees subtask-only assignments, changes only own statuses, comments and is denied admin screens", async ({
  page,
}) => {
  const { calls } = await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, staff.email);
  await expect(
    page.getByRole("link", { name: /Example Client — Annual audit/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Other staff work", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Unassigned tax job", { exact: false }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/staff-work.png",
    fullPage: true,
  });
  await page
    .getByRole("radiogroup", { name: /Milestone for Assigned review/ })
    .getByRole("radio", { name: "50%", exact: true })
    .click();
  await expect(
    page.getByText("In progress · 50%", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Example Client — Annual audit/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Other staff work" }),
  ).toBeVisible();
  await expect(
    page.getByRole("radiogroup", { name: /Milestone for Other staff work/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit engagement", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add sub-task", exact: true }),
  ).toHaveCount(0);
await page
    .getByRole("radiogroup", { name: /Milestone for Assigned review/ })
    .getByRole("radio", { name: "100%", exact: true })
    .click();
  await expect(
    page.getByText("Complete", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Progress: 50%", { exact: false })).toBeVisible();
  await page.getByLabel("Comment on").selectOption("others");
  await page.getByLabel("Your comment").fill("Context for the team");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(
    page.getByText("Context for the team", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit comment" })).toHaveCount(
    1,
  );
  for (const path of ["/clients", "/staff"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/tasks$/);
  }
  expect(
    calls.filter((call) => call.path === "/clients" || call.path === "/users"),
  ).toEqual([]);
  expect(calls.filter((call) => call.method === "PATCH").map((call) => call.body)).toEqual([{ progress: 50 }, { progress: 100 }]);
  expect(errors).toEqual([]);
});

test("auditor creates a job with quick-add client, edits dates, manages tasks and comments", async ({
  page,
}) => {
  const { calls } = await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page
    .getByRole("button", { name: "New engagement", exact: true })
    .click();
  await page.getByRole("button", { name: "Quick-add client" }).click();
  await page
    .getByRole("dialog", { name: "New client" })
    .getByLabel("Name", { exact: true })
    .fill("Quick client");
  await page
    .getByRole("button", { name: "Create client", exact: true })
    .click();
  const form = page.getByRole("dialog", { name: "New engagement" });
  await expect(form.getByLabel("Client", { exact: true })).not.toHaveValue("");
  await form.getByLabel("Primary staff").selectOption("staff");
  await form.getByLabel("Nature of work").fill("New audit scope");
  await form
    .getByRole("button", { name: "Create engagement", exact: true })
    .click();
  await page.getByRole("link", { name: "Quick client", exact: true }).click();
  await page
    .getByRole("link", { name: "New audit scope", exact: true })
    .click();
  await page.getByRole("button", { name: "Add sub-task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Audit checks");
  await page.getByLabel("Assigned to", { exact: true }).selectOption("staff");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add sub-task", exact: true })
    .click();
  await page.getByLabel("Status for Audit checks").selectOption("DONE");
  await expect(
    page.getByText("Progress: 100%", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/auditor-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Actions for Audit checks", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit sub-task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Revised checks");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Revised checks" }),
  ).toBeVisible();
  await page.getByLabel("Your comment").fill("Initial comment");
  await page.getByRole("button", { name: "Post comment" }).click();
  await page.getByRole("button", { name: "Edit comment", exact: true }).click();
  await page
    .getByLabel("Edit comment", { exact: true })
    .fill("Updated comment");
  await page.getByRole("button", { name: "Save comment", exact: true }).click();
  await expect(
    page.getByText("Updated comment", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete comment", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Updated comment", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Actions for Revised checks", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete sub-task", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Progress: 0%", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Delete engagement", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page).toHaveURL(/\/engagements$/);
  await expect(
    page.getByRole("link", { name: "Quick client", exact: true }),
  ).toHaveCount(0);
  await page.goto("/engagements/job");
  await page
    .getByRole("button", { name: "Edit engagement", exact: true })
    .click();
  await expect(page.getByLabel("Start date (BS)", { exact: true })).toHaveValue(
    "2083-05-16",
  );
  await page.getByLabel("Start date (BS)", { exact: true }).fill("");
  await page.getByLabel("Target date (BS)", { exact: true }).fill("");
  await page.getByLabel("Priority (optional)").selectOption("");
  await page
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("UNDER_REVIEW");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.find(
      (call) => call.method === "PATCH" && call.path === "/engagements/job",
    )?.body,
  ).toMatchObject({
    startDate: null,
    targetDate: null,
    priority: null,
    status: "UNDER_REVIEW",
  });
  expect(errors).toEqual([]);
});

test("mobile navigation uses one button, logout clears auditor data, and expired sessions return to login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await login(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Clients", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Clients", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(staff.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(
    page.getByText("Unassigned tax job", { exact: false }),
  ).toHaveCount(0);
  await page.route("http://localhost:5000/auth/me", (route) =>
    route.fulfill({ status: 401, json: { message: "Unauthorized" } }),
  );
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test("auditor manages clients and creates staff accounts", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Temporary client");
  await page
    .getByRole("button", { name: "Create client", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Temporary client" });
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Temporary client",
  );
  await page.getByLabel("Name", { exact: true }).fill("Renamed client");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Renamed client" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Renamed client", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Staff", exact: true }).click();
  await page.getByRole("button", { name: "Add staff", exact: true }).click();
  await page.getByLabel("Full name").fill("New colleague");
  await page
    .getByLabel("Email", { exact: true })
    .fill("colleague@test.example");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-12345");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add staff", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.find((call) => call.method === "POST" && call.path === "/users")
      ?.body,
  ).toEqual({
    name: "New colleague",
    email: "colleague@test.example",
    password: "Test-password-12345",
  });
});

test("API errors show retry controls instead of a misleading empty list", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.route("http://localhost:5000/engagements", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Temporarily unavailable" },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "Temporarily unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText("No engagements found", { exact: true }),
  ).toHaveCount(0);
  await page.unroute("http://localhost:5000/engagements");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Example Client", exact: true }),
  ).toBeVisible();
});

test("year switching isolates cached work and survives refresh; BS form sends AD", async ({
  page,
}) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements");
  await expect(
    page.getByRole("link", { name: "Example Client", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Fiscal year (BS)").selectOption("fy82");
  await expect(
    page.getByRole("link", { name: "Example Client", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Fiscal year (BS)")).toHaveValue("fy82");
  await page.getByLabel("Fiscal year (BS)").selectOption("fy83");
  await expect(
    page.getByRole("link", { name: "Example Client", exact: true }),
  ).toBeVisible();
  await page.goto("/engagements/job");
  await page
    .getByRole("button", { name: "Edit engagement", exact: true })
    .click();
  await page.getByLabel("Start date (BS)", { exact: true }).fill("2083-04-01");
  await page.getByLabel("Target date (BS)", { exact: true }).fill("2083-04-31");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.find(
      (call) => call.method === "PATCH" && call.path === "/engagements/job",
    ),
  ).toMatchObject({
    fiscalYear: "fy83",
    body: { startDate: "2026-07-17", targetDate: "2026-08-16" },
  });
  expect(
    calls
      .filter((call) => call.path === "/engagements")
      .map((call) => call.fiscalYear),
  ).toContain("fy82");
});

test("opening a fiscal year converts Shrawan boundaries and carries the selected client source", async ({
  page,
}) => {
  await mockApi(page);
  const years = [
    { id: "fy83", startDate: "2026-07-17", endDate: "2027-07-17" },
  ];
  let payload: unknown;
  await page.route("http://localhost:5000/fiscal-years", async (route) => {
    if (route.request().method() === "POST") {
      payload = route.request().postDataJSON();
      const year = {
        id: "fy84",
        startDate: "2027-07-17",
        endDate: "2028-07-16",
      };
      years.push(year);
      return route.fulfill({ status: 201, json: year });
    }
    return route.fulfill({ json: years });
  });
  await login(page);
  await page
    .getByRole("button", { name: "Open fiscal year", exact: true })
    .click();
  await page.getByLabel("Starting year (BS)").fill("2084");
  await expect(page.getByLabel("Copy client profiles from")).toHaveValue(
    "fy83",
  );
  await page.screenshot({
    path: "test-results/open-fiscal-year.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open year", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Fiscal year (BS)")).toHaveValue("fy84");
  expect(payload).toEqual({
    startDate: "2027-07-17",
    endDate: "2028-07-16",
    copyFromId: "fy83",
  });
});

test("dashboard tracks fiscal-year totals, stages, task progress and attention filters", async ({
  page,
}) => {
  const { engagements } = await mockApi(page);
  await page.clock.setFixedTime(new Date("2026-09-19T06:00:00Z"));
  engagements[0].status = "IN_PROGRESS";
  engagements[0].targetDate = "2026-09-18";
  engagements[0].subTasks[0].status = "DONE";
  engagements[0].subTasks[0].progress = 100;
  engagements[1].status = "DELIVERED";
  engagements[1].targetDate = "2026-09-01";
  engagements.push({
    ...engagements[1],
    id: "review",
    natureOfWork: "Review this audit",
    status: "UNDER_REVIEW",
    targetDate: "2026-09-20",
  });
  await page.route("http://localhost:5000/clients", (route) =>
    route.fulfill({
      json:
        route.request().headers()["x-fiscal-year-id"] === "fy83"
          ? [
              initialClient,
              { ...initialClient, id: "no-work", name: "Client without work" },
            ]
          : [],
    }),
  );
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Clients summary")).toContainText("2");
  await expect(page.getByLabel("Clients summary")).toContainText(
    "1 without engagements",
  );
  await expect(page.getByLabel("Engagements summary")).toContainText("3");
  await expect(page.getByLabel("Engagements summary")).toContainText("2 open");
  await expect(page.getByLabel("Overdue summary")).toContainText("1");
  await expect(page.getByLabel("Task progress summary")).toContainText("50%");
  await page.getByRole("button", { name: "Overdue (1)", exact: true }).click();
  await expect(page.getByText("Annual audit", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Review this audit", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Due within 7 days (1)", exact: true })
    .click();
  await expect(
    page.getByText("Review this audit", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Annual audit", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Delivered 1/ }).click();
  await expect(
    page.getByText("Unassigned tax job", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open work (2)", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/dashboard-overview.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Fiscal year (BS)").selectOption("fy82");
  await expect(page.getByLabel("Engagements summary")).toContainText("0 open");
  await expect(page.getByLabel("Clients summary")).toContainText(
    "0 without engagements",
  );
  await expect(
    page.getByText("No engagements in this fiscal year yet."),
  ).toBeVisible();
  await page.getByLabel("Fiscal year (BS)").selectOption("fy83");
  await expect(page.getByLabel("Engagements summary")).toContainText("2 open");
});

test("client names open dynamic yearly profiles with editing and preselected new work", async ({
  page,
}) => {
  const { engagements, calls } = await mockApi(page);
  engagements[1].clientId = "different-client";
  await login(page);
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByRole("link", { name: "Example Client", exact: true }).click();
  await expect(page).toHaveURL(/\/clients\/client$/);
  await expect(
    page.getByRole("heading", { name: "Example Client", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Client profile · FY 2083/84", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Annual audit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Unassigned tax job", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Example Client", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/client-profile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit client", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Updated profile name");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Updated profile name", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New engagement", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Client", { exact: true }),
  ).toHaveValue("client");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("link", { name: "Annual audit", exact: true }).click();
  await expect(page).toHaveURL(/\/engagements\/job$/);
  await page.goto("/clients/client");
  await page.getByLabel("Fiscal year (BS)").selectOption("fy82");
  await expect(
    page.getByRole("heading", { name: "Client not found", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Annual audit", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Fiscal year (BS)").selectOption("fy83");
  await expect(
    page.getByRole("heading", { name: "Updated profile name", exact: true }),
  ).toBeVisible();
  expect(
    calls
      .filter(
        (call) => call.path === "/clients/client" && call.method === "GET",
      )
      .map((call) => call.fiscalYear),
  ).toContain("fy82");
});

test("new clients have empty profiles and staff cannot access client profiles", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.goto("/clients");
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("New profile");
  await page
    .getByRole("button", { name: "Create client", exact: true })
    .click();
  await page.getByRole("link", { name: "New profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "New profile", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No engagements for this client in this fiscal year.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/client-profile-mobile.png",
    fullPage: true,
  });
  await page.goto("/clients/missing");
  await expect(
    page.getByRole("heading", { name: "Client not found", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, staff.email);
  await page.goto("/clients/client");
  await expect(page).toHaveURL(/\/tasks$/);
});


test("staff dashboard supports milestone comments, completion and task discussion", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page, staff.email);
  await page.goto("/dashboard");
  const task = page.getByRole("article", { name: "Assigned review", exact: true });
  await expect(task).toBeVisible();
  await task.getByLabel("Update comment for Assigned review").fill("Evidence ready for review");
  await task.getByRole("radio", { name: "75%", exact: true }).click();
  await expect(task.getByText(/In progress.*75%/)).toBeVisible();
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ progress: 75, comment: "Evidence ready for review" });
  await task.getByRole("radio", { name: "100%", exact: true }).click();
  await expect(task).toHaveCount(0);
  await page.getByRole("button", { name: "Complete (1)", exact: true }).click();
  await expect(task.getByText("Complete", { exact: true })).toBeVisible();
  await task.getByRole("button", { name: /Discussion & updates/ }).click();
  const dialog = page.getByRole("dialog", { name: "Assigned review" });
  await dialog.getByLabel("Your comment").fill("Please check my completed work");
  await dialog.getByRole("button", { name: "Post comment", exact: true }).click();
  await expect(dialog.getByText("Please check my completed work", { exact: true })).toBeVisible();
  expect(calls.filter((call) => call.method === "POST").at(-1)?.path).toBe("/subtasks/own/comments");
});


test("primary staff updates an engagement without subtasks from My work and dashboard", async ({ page }) => {
  const { calls } = await mockApi(page, true);
  await login(page, staff.email);
  const form = page.getByRole("form", { name: "Update engagement progress" });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "50%", exact: true }).click();
  await form.getByLabel("Engagement update comment").fill("Field work completed");
  await form.getByRole("button", { name: "Save progress update" }).click();
  await expect(page.getByText("Overall progress: 50%", { exact: true })).toBeVisible();
  expect(calls.filter((call) => call.path === "/engagements/job/progress").at(-1)?.body).toEqual({ progress: 50, comment: "Field work completed" });
  await page.goto("/dashboard");
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "100%", exact: true }).click();
  await form.getByRole("button", { name: "Save progress update" }).click();
  await expect(form.getByText(/Current: 100%/)).toBeVisible();
  await expect(page.getByText("0 open", { exact: false })).toBeVisible();
  await page.goto("/engagements/job");
  await expect(form).toBeVisible();
  await expect(page.getByText("Complete", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/engagement-progress.png", fullPage: true });
});


test("engagement list opens its workspace and planning fields stay on the parent task", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements");
  await page.getByLabel("Search engagements").fill("Annual audit");
  await expect(page.getByRole("link", { name: "Unassigned tax job", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Example Client", exact: true }).click();
  await expect(page).toHaveURL(/\/engagements\/job$/);
  await page.getByRole("button", { name: "Add sub-task", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Example Client.*Annual audit/)).toBeVisible();
  await dialog.getByLabel("Title", { exact: true }).fill("Deadline review");
  await dialog.getByLabel("Assigned to", { exact: true }).selectOption("staff");
  await dialog.getByLabel("Due date (BS, optional)").fill("2083-04-01");
  await dialog.getByLabel("Priority", { exact: true }).selectOption("URGENT");
  await dialog.getByRole("button", { name: "Add sub-task", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const created = calls.filter((call) => call.method === "POST" && call.path.endsWith("/subtasks")).at(-1);
  expect(created?.path).toBe("/engagements/job/subtasks");
  expect(created?.body).toMatchObject({ dueDate: "2026-07-17", priority: "URGENT" });
  await page.getByLabel("Search sub-tasks").fill("Deadline review");
  await expect(page.getByRole("heading", { name: "Deadline review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assigned review" })).toHaveCount(0);
  await page.getByLabel("Filter sub-task status").selectOption("DONE");
  await expect(page.getByText("No sub-tasks match these filters.")).toBeVisible();
});

test("project workspace switches board, list and deadline timeline with parent context", async ({ page }) => {
  const { engagements } = await mockApi(page);
  engagements[0].subTasks[0].dueDate = "2026-09-18";
  engagements[0].subTasks[0].priority = "HIGH";
  engagements[0].subTasks[1].status = "IN_PROGRESS";
  engagements[0].subTasks[1].progress = 50;
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/engagements/job");
  await expect(page.getByRole("button", { name: "Board", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "To do tasks" }).getByRole("heading", { name: "Assigned review" })).toBeVisible();
  await expect(page.getByText("PARENT ENGAGEMENT", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/project-board.png", fullPage: true });
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByText("Unscheduled · No due date")).toBeVisible();
  await page.screenshot({ path: "test-results/project-timeline.png", fullPage: true });
  await page.getByRole("button", { name: "Assigned review", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Sub-task of Annual audit · Example Client")).toBeVisible();
  await expect(dialog.getByText("HIGH", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("article", { name: "Assigned review", exact: true })).toBeVisible();
  await page.getByLabel("Filter sub-task assignee").selectOption("other");
  await expect(page.getByRole("article", { name: "Assigned review", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page.getByRole("article", { name: "Assigned review", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/project-mobile.png", fullPage: true });
});


test("client details validate PAN, persist on edit and can be cleared", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/clients");
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Detailed client");
  await dialog.getByLabel("PAN (9 digits, optional)").fill("12345");
  await dialog.getByRole("button", { name: "Create client", exact: true }).click();
  await expect(dialog.getByText("PAN must contain exactly 9 digits")).toBeVisible();
  await dialog.getByLabel("PAN (9 digits, optional)").fill("012345678");
  await dialog.getByLabel("Address (optional)").fill("Kathmandu, Nepal");
  await dialog.getByLabel("File location (optional)").fill("Cabinet A / Shelf 2");
  await dialog.getByRole("button", { name: "Create client", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.filter((call) => call.method === "POST" && call.path === "/clients").at(-1)?.body).toEqual({ name: "Detailed client", pan: "012345678", location: "Kathmandu, Nepal", fileLocation: "Cabinet A / Shelf 2" });
  await page.getByRole("link", { name: "Detailed client", exact: true }).click();
  await expect(page).toHaveURL(/\/clients\/[^/]+$/);
  await expect(page.getByText("012345678", { exact: true })).toBeVisible();
  await expect(page.getByText("Kathmandu, Nepal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit client", exact: true }).click();
  await expect(dialog.getByLabel("PAN (9 digits, optional)")).toHaveValue("012345678");
  await expect(dialog.getByLabel("File location (optional)")).toHaveValue("Cabinet A / Shelf 2");
  await dialog.getByLabel("PAN (9 digits, optional)").fill("");
  await dialog.getByLabel("Address (optional)").fill("");
  await dialog.getByLabel("File location (optional)").fill("");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ name: "Detailed client", pan: null, location: null, fileLocation: null });
});

test("auditors cannot edit staff comments in engagement or task discussions", async ({ page }) => {
  const { engagements } = await mockApi(page);
  engagements[0].comments.push({ id: "staff-comment", engagementId: "job", subTaskId: "own", authorId: staff.id, author: staff, text: "Staff evidence update", createdAt: staff.createdAt });
  await login(page);
  await page.goto("/engagements/job");
  await expect(page.getByText("Staff evidence update", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit comment", exact: true })).toHaveCount(0);
  await page.getByRole("article", { name: "Assigned review", exact: true }).getByRole("button", { name: "Discussion & updates (1)" }).click();
  await expect(page.getByRole("dialog").getByText("Staff evidence update", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Edit comment", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, staff.email);
  await page.goto("/engagements/job");
  await page.getByRole("button", { name: "Edit comment", exact: true }).click();
  await page.getByLabel("Edit comment", { exact: true }).fill("Corrected by its author");
  await page.getByRole("button", { name: "Save comment", exact: true }).click();
  await expect(page.getByText("Corrected by its author", { exact: true })).toBeVisible();
});

test("client search, mobile layouts and unsaved forms remain usable", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.screenshot({ path: "test-results/design-dashboard.png", fullPage: true });
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Unsaved client");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Discard unsaved changes?");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Unsaved client");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
  await page.getByLabel("Name", { exact: true }).fill("Zebra Company");
  await page.getByLabel("PAN (9 digits, optional)").fill("123456789");
  await page.getByRole("button", { name: "Create client", exact: true }).click();
  await page.getByRole("textbox", { name: "Search clients" }).fill("123456789");
  await expect(page.getByRole("row").filter({ hasText: "Zebra Company" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Example Client" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search clients" }).fill("no matches");
  await expect(page.getByText("No matching clients", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByLabel("Sort clients").selectOption("desc");
  await expect(page.getByRole("row").nth(1)).toContainText("Zebra Company");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("article").filter({ hasText: "Zebra Company" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/design-mobile-clients.png", fullPage: true });
  await page.goto("/engagements");
  await expect(page.getByRole("article").filter({ hasText: "Annual audit" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/design-mobile-engagements.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/design-mobile-dark.png", fullPage: true });
});

test("form failure stays visible and retains entered values", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.route("http://localhost:5000/clients", (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 503, json: { message: "Please try again shortly" } })
    : route.fallback());
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Retained client");
  await page.getByRole("button", { name: "Create client", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Please try again shortly");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Retained client");
  await page.screenshot({ path: "test-results/design-form-error.png", fullPage: true });
});

test("BS calendar selects real month days, validates range and saves selected priority", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements");
  await page.getByRole("button", { name: "New engagement", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New engagement" });
  await dialog.getByLabel("Client", { exact: true }).selectOption("client");
  await dialog.getByLabel("Primary staff", { exact: true }).selectOption("staff");
  await dialog.getByLabel("Nature of work").fill("Calendar audit");
  await dialog.getByRole("button", { name: "Choose Start date (BS)", exact: true }).click();
  await dialog.getByLabel("Start date (BS) year", { exact: true }).selectOption("2083");
  await dialog.getByLabel("Start date (BS) month", { exact: true }).selectOption("3");
  await expect(dialog.getByRole("button", { name: "2083-03-32 BS", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "2083-03-32 BS", exact: true }).click();
  await expect(dialog.getByLabel("Start date (BS)", { exact: true })).toHaveValue("2083-03-32");
  await dialog.getByRole("button", { name: "Choose Target date (BS)", exact: true }).click();
  await dialog.getByLabel("Target date (BS) year", { exact: true }).selectOption("2083");
  await dialog.getByLabel("Target date (BS) month", { exact: true }).selectOption("4");
  await expect(dialog.getByRole("button", { name: "2083-04-33 BS", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/bs-date-picker.png", fullPage: true });
  await dialog.getByRole("button", { name: "2083-04-01 BS", exact: true }).click();
  await dialog.getByLabel("Priority (optional)").selectOption("Low");
  await dialog.getByLabel("Target date (BS)", { exact: true }).fill("2083-03-01");
  await dialog.getByRole("button", { name: "Create engagement", exact: true }).click();
  await expect(dialog.getByText("Target date cannot precede start date")).toBeVisible();
  await dialog.getByLabel("Target date (BS)", { exact: true }).fill("2083-04-01");
  await dialog.getByRole("button", { name: "Create engagement", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.find((call) => call.path === "/engagements" && call.method === "POST")?.body).toMatchObject({ startDate: "2026-07-16", targetDate: "2026-07-17", priority: "Low" });
  await expect(page.getByRole("region", { name: "Low priority group" }).getByRole("link", { name: "Calendar audit", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Calendar audit", exact: true }).click();
  await page.getByRole("button", { name: "Edit engagement", exact: true }).click();
  await expect(page.getByLabel("Start date (BS)", { exact: true })).toHaveValue("2083-03-32");
  await expect(page.getByLabel("Priority (optional)")).toHaveValue("Low");
});

test("priority groups normalize older casing and preserve uncategorized work", async ({ page }) => {
  const { engagements } = await mockApi(page);
  engagements[0].priority = " high ";
  engagements[1].priority = "Low";
  engagements.push({ ...engagements[0], id: "medium", natureOfWork: "Medium work", priority: "Medium" });
  engagements.push({ ...engagements[0], id: "other", natureOfWork: "Custom work", priority: "Special" });
  engagements.push({ ...engagements[0], id: "none", natureOfWork: "No priority", priority: null });
  await login(page);
  await page.goto("/engagements");
  const groups = page.locator('section[aria-label$="priority group"]');
  await expect(groups).toHaveCount(5);
  await expect(groups.nth(0)).toHaveAttribute("aria-label", "High priority group");
  await expect(groups.nth(1)).toHaveAttribute("aria-label", "Medium priority group");
  await expect(groups.nth(2)).toHaveAttribute("aria-label", "Low priority group");
  await expect(groups.nth(3)).toHaveAttribute("aria-label", "Other priority group");
  await expect(groups.nth(4)).toHaveAttribute("aria-label", "Not set priority group");
  await page.getByLabel("Search engagements").fill("Medium work");
  await expect(groups).toHaveCount(1);
  await expect(groups).toHaveAttribute("aria-label", "Medium priority group");
});
