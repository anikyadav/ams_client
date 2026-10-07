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
    if (method === "GET" && path.endsWith("/activity")) return respond([]);
    if (method === "GET" && path.endsWith("/participants"))
      return respond(
        [auditor, staff, other].map(({ id, name, role }) => ({ id, name, role })),
      );
    if (method === "POST" && path === "/engagements/clone")
      return respond(
        {
          created: [{ id: "cloned", clientName: "Example Client", natureOfWork: "Old audit" }],
          skipped: [{ sourceId: "x", label: "Other work", reason: "Already exists in this fiscal year" }],
        },
        201,
      );
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
      if (parts[3] === "requests") {
        const request = {
          id: nextId(),
          engagementId: job.id,
          title: body.title,
          description: null,
          dueDate: body.dueDate ?? null,
          status: "REQUESTED" as const,
          reference: null,
          receivedAt: null,
          receivedBy: null,
          createdAt: auditor.createdAt,
        };
        (job.documentRequests ??= []).push(request);
        return respond(request, 201);
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
    if (parts[1] === "document-requests") {
      const owner = engagements.find((item) =>
        (item.documentRequests ?? []).some((request) => request.id === parts[2]),
      )!;
      const request = owner.documentRequests!.find((item) => item.id === parts[2])!;
      if (method === "PATCH") {
        Object.assign(request, body);
        if (body.status === "RECEIVED") {
          request.receivedBy = actor;
          request.receivedAt = auditor.createdAt;
        }
        return respond(request);
      }
      owner.documentRequests = owner.documentRequests!.filter((item) => item.id !== request.id);
      return route.fulfill({ status: 204 });
    }
    if (parts[1] === "checklist-items") {
      const holder = engagements
        .flatMap((item) => item.subTasks)
        .find((candidate) => (candidate.checklist ?? []).some((entry) => entry.id === parts[2]))!;
      const entry = holder.checklist!.find((item) => item.id === parts[2])!;
      if (method === "PATCH") Object.assign(entry, body);
      else holder.checklist = holder.checklist!.filter((item) => item.id !== entry.id);
      return respond(holder);
    }
    if (parts[1] === "subtasks") {
      const parent = engagements.find((job) =>
        job.subTasks.some((task) => task.id === parts[2]),
      )!;
      const task = parent.subTasks.find((task) => task.id === parts[2])!;
      if (parts[3] === "review") {
        if (body.decision === "APPROVE") task.reviewState = "APPROVED";
        else {
          task.reviewState = "CHANGES_REQUESTED";
          task.reviewNote = body.note;
          task.status = "IN_PROGRESS";
          task.progress = 75;
        }
        return respond(task, 201);
      }
      if (parts[3] === "checklist") {
        (task.checklist ??= []).push({ id: nextId(), text: body.text, done: false });
        return respond(task, 201);
      }
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
  await page.getByLabel("Status for Assigned review").selectOption("IN_PROGRESS");
  await expect(page.getByLabel("Status for Assigned review")).toHaveValue("IN_PROGRESS");
  await page
    .getByRole("link", { name: /Example Client — Annual audit/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Other staff work" }),
  ).toBeVisible();
  await expect(page.getByLabel("Status for Other staff work")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit engagement", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add sub-task", exact: true }),
  ).toHaveCount(0);
await page.getByRole("button", { name: "Assigned review", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("radiogroup", { name: /Milestone for Assigned review/ })
    .getByRole("radio", { name: "100%", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Status for Assigned review")).toHaveValue("DONE");
  await expect(page.getByText("Progress: 50%", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: /Discussion & activity/ }).click();
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
  expect(calls.filter((call) => call.method === "PATCH").map((call) => call.body)).toEqual([{ status: "IN_PROGRESS" }, { progress: 100 }]);
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
  await page.getByRole("button", { name: "Create new sub-task", exact: true }).first().click();
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
  await page.getByRole("tab", { name: /Discussion & activity/ }).click();
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
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page.getByRole("button", { name: "Actions for Revised checks", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete sub-task", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Progress: 0%", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "More engagement actions", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Delete engagement", exact: true })
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
  await task.getByLabel("Status for Assigned review").selectOption("DONE");
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ status: "DONE" });
  await expect(task).toHaveCount(0);
  await page.getByRole("button", { name: "Complete (1)", exact: true }).click();
  await expect(task.getByLabel("Status for Assigned review")).toHaveValue("DONE");
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
  await page.goto("/engagements/job?tab=overview");
  await expect(form).toBeVisible();
  await expect(page.getByText("Complete", { exact: true }).first()).toBeVisible();
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
  await page.getByRole("button", { name: "Create new sub-task", exact: true }).first().click();
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
  await expect(page.getByRole("button", { name: "Checklist", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page).toHaveURL(/view=board/);
  await expect(page.getByRole("region", { name: "To do tasks" }).getByRole("heading", { name: "Assigned review" })).toBeVisible();
  await page.screenshot({ path: "test-results/project-board.png", fullPage: true });
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByText("Unscheduled · No due date")).toBeVisible();
  await page.screenshot({ path: "test-results/project-timeline.png", fullPage: true });
  await page.getByRole("button", { name: "Assigned review", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(page).toHaveURL(/task=own/);
  await expect(dialog.getByText("Sub-task of Annual audit · Example Client")).toBeVisible();
  await expect(dialog.getByText("HIGH", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("row", { name: "Assigned review", exact: true })).toBeVisible();
  await page.getByLabel("Filter sub-task assignee").selectOption("other");
  await expect(page.getByRole("row", { name: "Assigned review", exact: true })).toHaveCount(0);
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
  await page.goto("/engagements/job?tab=activity");
  await expect(page.getByText("Staff evidence update", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit comment", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page.getByRole("article", { name: "Assigned review", exact: true }).getByRole("button", { name: "Discussion & updates (1)" }).click();
  await expect(page.getByRole("dialog").getByText("Staff evidence update", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Edit comment", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, staff.email);
  await page.goto("/engagements/job?tab=activity");
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

test("quick filters live in the URL, and a task opens straight from ?task= with a merged feed", async ({ page }) => {
  const { engagements } = await mockApi(page);
  engagements[0].subTasks[0].dueDate = "2020-01-01";
  engagements[0].comments.push({ id: "c1", engagementId: "job", subTaskId: "own", authorId: staff.id, author: staff, text: "Evidence uploaded", createdAt: staff.createdAt });
  await login(page);
  await page.goto("/engagements/job?quick=overdue");
  await expect(page.getByRole("button", { name: /^Overdue/, pressed: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Assigned review", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Other staff work", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/quick=/);
  await expect(page.getByRole("article", { name: "Other staff work", exact: true })).toBeVisible();
  await page.goto("/engagements/job?task=own");
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "Assigned review" })).toBeVisible();
  await drawer.getByRole("tab", { name: /Discussion & activity/ }).click();
  await expect(drawer.getByText("Evidence uploaded")).toBeVisible();
  await drawer.getByRole("button", { name: /^History/ }).click();
  await expect(drawer.getByText("Evidence uploaded")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/task=/);
});

test("assignee filtering permits engagement tab navigation and keeps the filter", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto("/engagements/job");
  await page.getByLabel("Filter sub-task assignee").selectOption("staff");
  for (const name of ["Overview", "Requests", "Discussion & activity"]) {
    const tab = page.getByRole("tab", { name: new RegExp(`^${name}`) });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/assignee=staff/);
  }
  await page.getByRole("tab", { name: "Tasks" }).click();
  await expect(page.getByLabel("Filter sub-task assignee")).toHaveValue("staff");
  await expect(page.getByRole("article", { name: "Assigned review", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Other staff work", exact: true })).toHaveCount(0);
});

test("engagement shows health, a stage stepper and an overview tab", async ({ page }) => {
  const { engagements, calls } = await mockApi(page);
  engagements[0].subTasks[0].dueDate = "2020-01-01";
  await login(page);
  await page.goto("/engagements/job");
  await expect(page.getByText("Off track").first()).toBeVisible();
  await page.getByRole("button", { name: "Set stage to In progress" }).click();
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ status: "IN_PROGRESS" });
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page).toHaveURL(/tab=overview/);
  await expect(page.getByText("Needs attention", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Assigned review/ })).toBeVisible();
  await expect(page.getByText("1 overdue task", { exact: true })).toBeVisible();
});

test("board cards drag between status columns", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements/job?view=board");
  await page
    .getByRole("region", { name: "To do tasks" })
    .getByRole("article", { name: "Assigned review", exact: true })
    .dragTo(page.getByRole("region", { name: "In progress tasks" }));
  await expect.poll(() => calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ status: "IN_PROGRESS" });
});

test("list view sorts, edits priority in place and adds a task inline", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements/job?view=list");
  const row = page.getByRole("row", { name: "Assigned review", exact: true });
  await row.getByLabel("Priority for Assigned review").selectOption("URGENT");
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ priority: "URGENT" });
  await page.getByRole("button", { name: "Task", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Task" })).toHaveAttribute("aria-sort", "ascending");
  await page.getByLabel("Quick add sub-task").fill("Prepare workpapers");
  await page.getByLabel("Quick add sub-task").press("Enter");
  const created = calls.filter((call) => call.method === "POST" && call.path.endsWith("/subtasks")).at(-1);
  expect(created?.body).toMatchObject({ title: "Prepare workpapers", priority: "MEDIUM" });
});

test("team work page shows tasks, workload, calendar and the review queue", async ({ page }) => {
  const { engagements, calls } = await mockApi(page);
  engagements[0].subTasks[0].dueDate = "2020-01-01";
  await login(page);
  await page.getByRole("link", { name: "Team work", exact: true }).click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByRole("row", { name: "Assigned review", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Overdue/ }).click();
  await expect(page).toHaveURL(/quick=overdue/);
  await expect(page.getByRole("row", { name: "Other staff work", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Workload" }).click();
  await expect(page.getByText("Staff One").first()).toBeVisible();
  await page.getByRole("tab", { name: "Calendar" }).click();
  await expect(page.getByRole("region", { name: "Overdue" }).getByText("Assigned review")).toBeVisible();
  engagements[0].subTasks.forEach((task) => {
    task.templateKey = "DOCUMENT";
    task.status = "DONE";
    task.reviewState = "APPROVED";
  });
  await page.goto("/work?tab=review");
  await expect(page.getByRole("region", { name: "Ready for review" })).toBeVisible();
  await page.getByRole("button", { name: "Send to review" }).click();
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ status: "UNDER_REVIEW" });
});

test("Ctrl+K opens a search palette that jumps to engagements and tasks", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search" });
  await dialog.getByRole("combobox").fill("Assigned review");
  await expect(dialog.getByRole("option", { name: /Assigned review/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/engagements\/job\?task=own$/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search (Ctrl K)" }).click();
  await page.getByRole("combobox").fill("Example");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/engagements\/job$/);
});

test("task sign-off: auditors approve or send back, and completion waits for approval", async ({ page }) => {
  const { engagements, calls } = await mockApi(page);
  const task = engagements[0].subTasks[0];
  task.status = "DONE";
  task.progress = 100;
  task.reviewState = "SUBMITTED";
  task.submittedBy = staff;
  task.submittedAt = staff.createdAt;
  engagements[0].subTasks.forEach((item, index) => {
    item.templateKey = ["VAT_RECO", "SALES_RECO"][index];
  });
  await login(page);
  await page.goto("/engagements/job");
  await expect(page.getByRole("button", { name: "Set stage to Complete" })).toBeDisabled();
  await page.goto("/engagements/job?task=own");
  const panel = page.getByRole("dialog").getByRole("region", { name: "Sign-off" });
  await expect(panel.getByText(/Submitted for review by/)).toBeVisible();
  await panel.getByRole("button", { name: "Request changes" }).click();
  expect(calls.some((call) => call.path === "/subtasks/own/review")).toBe(false);
  await panel.getByLabel("Review note").fill("Attach the signed copy");
  await panel.getByRole("button", { name: "Request changes" }).click();
  expect(calls.filter((call) => call.path === "/subtasks/own/review").at(-1)?.body).toEqual({
    decision: "REQUEST_CHANGES",
    note: "Attach the signed copy",
  });
  await expect(panel.getByText("Attach the signed copy")).toBeVisible();
  task.reviewState = "SUBMITTED";
  task.status = "DONE";
  await page.reload();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  expect(calls.filter((call) => call.path === "/subtasks/own/review").at(-1)?.body).toMatchObject({
    decision: "APPROVE",
  });
  await expect(page.getByRole("dialog").getByText("Approved", { exact: false }).first()).toBeVisible();
});

test("review queue lists submitted tasks and approves them in place", async ({ page }) => {
  const { engagements, calls } = await mockApi(page);
  engagements[0].subTasks[0].reviewState = "SUBMITTED";
  engagements[0].subTasks[0].status = "DONE";
  await login(page);
  await page.goto("/work?tab=review");
  const section = page.getByRole("region", { name: "Tasks awaiting review" });
  await expect(section.getByText("Assigned review")).toBeVisible();
  await section.getByRole("button", { name: "Approve Assigned review" }).click();
  expect(calls.filter((call) => call.path === "/subtasks/own/review").at(-1)?.body).toMatchObject({ decision: "APPROVE" });
});

test("checklist steps and blockers are managed from the task drawer", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements/job?task=own");
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Add a step").fill("Collect the ledger");
  await drawer.getByRole("button", { name: "Add", exact: true }).click();
  expect(calls.filter((call) => call.path === "/subtasks/own/checklist").at(-1)?.body).toEqual({ text: "Collect the ledger" });
  await drawer.getByRole("checkbox", { name: "Collect the ledger" }).click();
  await expect(drawer.getByRole("checkbox", { name: "Collect the ledger" })).toBeChecked();
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ done: true });
  await drawer.getByLabel("Why is this task blocked?").fill("Waiting for the bank letter");
  await drawer.getByRole("button", { name: "Mark blocked" }).click();
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ blockedReason: "Waiting for the bank letter" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("article", { name: "Assigned review", exact: true }).getByText("Blocked")).toBeVisible();
  await expect(page.getByText("Off track").or(page.getByText("At risk")).first()).toBeVisible();
});

test("document requests are added, received with a note and tracked", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements/job?tab=requests");
  await page.getByLabel("Requested document").fill("Bank statements");
  await page.getByRole("button", { name: "Add request" }).click();
  expect(calls.filter((call) => call.path === "/engagements/job/requests").at(-1)?.body).toMatchObject({ title: "Bank statements" });
  const item = page.getByRole("listitem", { name: "Bank statements" });
  await expect(item).toBeVisible();
  await item.getByRole("checkbox").click();
  await item.getByLabel("Where is Bank statements kept?").fill("Cabinet A / Folder 3");
  await item.getByRole("button", { name: "Mark received" }).click();
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ status: "RECEIVED", reference: "Cabinet A / Folder 3" });
  await expect(page.getByText("1 of 1 received")).toBeVisible();
  await expect(item.getByText(/Cabinet A \/ Folder 3/)).toBeVisible();
});

test("copying from a previous year lists that year's engagements and reports the outcome", async ({ page }) => {
  const { engagements, calls } = await mockApi(page);
  engagements.push({ ...engagements[0], id: "old", fiscalYearId: "fy82", natureOfWork: "Old audit" });
  await login(page);
  await page.goto("/engagements");
  await page.getByRole("button", { name: "Copy from previous year" }).click();
  const dialog = page.getByRole("dialog", { name: "Copy from a previous year" });
  await expect(dialog.getByText("Old audit")).toBeVisible();
  await dialog.getByRole("checkbox", { name: /Example Client — Old audit/ }).check();
  await dialog.getByRole("button", { name: /^Copy 1 engagement/ }).click();
  expect(calls.filter((call) => call.path === "/engagements/clone").at(-1)?.body).toEqual({ sourceIds: ["old"] });
  await expect(dialog.getByText("Already exists in this fiscal year")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Example Client — Old audit/ })).toBeVisible();
});

test("typing @ suggests people and the mention is posted as plain text", async ({ page }) => {
  const { calls } = await mockApi(page);
  await login(page);
  await page.goto("/engagements/job?tab=activity");
  const box = page.getByLabel("Your comment");
  await box.fill("Please look @Sta");
  await expect(page.getByRole("option", { name: /Staff One/ })).toBeVisible();
  await box.press("Enter");
  await expect(box).toHaveValue("Please look @Staff One ");
  await box.pressSequentially("thanks");
  await page.getByRole("button", { name: "Post comment" }).click();
  expect(calls.filter((call) => call.path === "/engagements/job/comments").at(-1)?.body).toEqual({ text: "Please look @Staff One thanks" });
  await expect(page.getByText("@Staff One", { exact: true })).toBeVisible();
});
