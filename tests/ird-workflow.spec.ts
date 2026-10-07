import { test, expect, type Page } from "@playwright/test";
import type { Client, Engagement, User } from "../lib/types";

const auditor: User = {
  id: "auditor",
  name: "Auditor",
  email: "auditor@test.example",
  role: "AUDITOR",
  createdAt: "2026-09-01T00:00:00Z",
};
const staff: User = { ...auditor, id: "staff", name: "Staff", role: "STAFF" };
const client: Client = {
  id: "client",
  name: "Test Client",
  fiscalYearId: "fy",
  lineageId: "client",
  pan: "012345678",
  createdAt: auditor.createdAt,
};
const job: Engagement = {
  id: "job",
  fiscalYearId: "fy",
  clientId: client.id,
  client,
  natureOfWork: "Annual audit",
  status: "NOT_STARTED",
  staffId: staff.id,
  staff,
  startDate: null,
  targetDate: null,
  priority: null,
  createdAt: auditor.createdAt,
  progress: 0,
  comments: [],
  subTasks: [
    "Document",
    "Vat Reco",
    "Sales Reco",
    "Purchase Reco",
    "Sales Confirmation",
    "Purchase Confirmation",
  ].map((title, i) => ({
    id: `task-${i + 1}`,
    templateKey: [
      "DOCUMENT",
      "VAT_RECO",
      "SALES_RECO",
      "PURCHASE_RECO",
      "SALES_CONFIRMATION",
      "PURCHASE_CONFIRMATION",
    ][i],
    sortOrder: i + 1,
    engagementId: "job",
    title,
    description: null,
    status: "TODO",
    progress: 0,
    assignedToId: staff.id,
    assignedTo: staff,
    createdAt: auditor.createdAt,
  })),
};

async function mock(page: Page, user = auditor) {
  const patches: Record<string, unknown>[] = [];
  let details = {
    registrationNo: "000123",
    userId: "000456",
    hasPassword: true,
    nextRenewalDate: null as string | null,
  };
  await page.route("http://localhost:5000/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, json: body });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/health/ready") return json({ status: "ok" });
    if (path === "/auth/login")
      return json({
        accessToken: "test",
        tokenType: "Bearer",
        expiresIn: 3600,
        user,
      });
    if (path === "/auth/me") return json(user);
    if (path === "/fiscal-years")
      return json([
        { id: "fy", startDate: "2026-07-17", endDate: "2027-07-17" },
      ]);
    if (path === "/notifications") return json({ items: [], unreadCount: 0 });
    if (path === "/subtasks/task-1/activity")
      return json([
        {
          id: "activity-1",
          engagementId: "job",
          subTaskId: "task-1",
          actor: auditor,
          action: "DOCUMENT_UPDATED",
          summary:
            "Updated Document fields: 1.1 Registration No.; 1.4 Next renewal date.",
          createdAt: auditor.createdAt,
        },
      ]);
    if (path === "/activity/mine" || path.endsWith("/activity"))
      return json([]);
    if (path === "/clients") return json([client]);
    if (path === "/clients/client") return json(client);
    if (path === "/engagements") return json([job]);
    if (path === "/engagements/job") return json(job);
    if (path === "/users") return json([staff]);
    if (path.endsWith("/challenge"))
      return json(
        {
          token: "test-challenge",
          question: "3 + 4",
          expiresAt: Date.now() + 120000,
        },
        201,
      );
    if (path.endsWith("/reveal")) {
      return req.postDataJSON().answer === 7
        ? json({ password: "=test-IRD-password" }, 201)
        : json(
            {
              message:
                "Incorrect answer or expired challenge. Try a new calculation.",
            },
            400,
          );
    }
    if (path === "/clients/ird-credentials/export") {
      expect(req.headers()["x-fiscal-year-id"]).toBe("fy");
      return route.fulfill({
        status: 201,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Buffer.from("test workbook"),
      });
    }
    if (
      path === "/subtasks/task-1/document" ||
      path === "/clients/client/ird-credentials"
    ) {
      if (req.method() === "PATCH") {
        const payload = req.postDataJSON() as Record<string, unknown>;
        patches.push(payload);
        details = {
          registrationNo: String(payload.registrationNo ?? ""),
          userId: String(payload.userId ?? ""),
          nextRenewalDate: payload.nextRenewalDate as string | null,
          hasPassword: payload.password !== null,
        };
      }
      return json(details);
    }
    return json({ message: "Not found" }, 404);
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    user.role === "AUDITOR" ? /\/dashboard$/ : /\/tasks$/,
  );
  return patches;
}

test("Document shows IRD fields, uses the BS calendar, keeps blank passwords and checks reveal answers", async ({
  page,
}) => {
  const patches = await mock(page);
  await page.goto("/engagements/job");
  await expect(
    page.getByRole("heading", { name: "Engagement checklist" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Checklist", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /7\. Any other/ })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Actions for Document", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Delete sub-task" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "1. Document", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("tab", { name: /Discussion & activity/ }).click();
  await expect(
    modal.getByRole("heading", { name: "Sub-task activity" }),
  ).toBeVisible();
  await expect(modal.getByRole("region", { name: "Sub-task activity" })).toContainText("Updated Document fields: 1.1 Registration No.; 1.4 Next renewal date.");
  await modal.getByRole("tab", { name: "Details" }).click();
  await expect(modal.getByLabel("1.2 IRD user ID")).toHaveValue("000456");
  await expect(modal.getByLabel("1.3 Replace IRD password")).toHaveAttribute(
    "type",
    "password",
  );
  await modal
    .getByRole("button", { name: "Choose Next renewal date (BS)" })
    .click();
  await expect(
    modal.getByRole("region", { name: "Next renewal date (BS) calendar" }),
  ).toBeVisible();
  await modal
    .getByRole("button", { name: "Choose Next renewal date (BS)" })
    .click();
  await modal
    .getByLabel("1.4 Next renewal date (BS)", { exact: true })
    .fill("2083-06-21");
  await modal.getByRole("button", { name: "Save IRD details" }).click();
  await expect(
    page.getByText("Client IRD details saved", { exact: true }),
  ).toBeVisible();
  expect(patches[0]).not.toHaveProperty("password");
  expect(patches[0].nextRenewalDate).toMatch(/^2026-\d{2}-\d{2}$/);
  await modal.getByRole("button", { name: "Reveal saved password" }).click();
  await modal.getByLabel("Solve 3 + 4 = ?").fill("8");
  await modal.getByRole("button", { name: "Check and reveal" }).click();
  await expect(modal.getByRole("alert")).toContainText("Incorrect answer");
  await modal.getByLabel("Solve 3 + 4 = ?").fill("7");
  await modal.getByRole("button", { name: "Check and reveal" }).click();
  await expect(modal.getByLabel("Revealed password")).toHaveText(
    "=test-IRD-password",
  );
  await modal
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(modal.getByLabel("Revealed password")).toHaveCount(0);
});

test("auditor can save IRD details without an engagement and download the fiscal-year list", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/clients/client");
  await expect(
    page.getByRole("heading", { name: "Client IRD portal details" }),
  ).toBeVisible();
  await page.goto("/clients");
  await page.getByRole("button", { name: "Export IRD credentials" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toContainText("readable passwords");
  await modal.getByLabel("Solve 3 + 4 = ?").fill("7");
  const downloaded = page.waitForEvent("download");
  await modal.getByRole("button", { name: "Download Excel list" }).click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /^ird-credentials-.*\.xlsx$/,
  );
  await expect(modal).toHaveCount(0);
});

test("staff can access their Document task but cannot see the fiscal-year export", async ({
  page,
}) => {
  await mock(page, staff);
  await page.goto("/engagements/job");
  await page.getByRole("button", { name: "1. Document", exact: true }).click();
  await expect(page.getByLabel("1.2 IRD user ID")).toHaveValue("000456");
  await expect(
    page.getByRole("button", { name: "Export IRD credentials" }),
  ).toHaveCount(0);
});
