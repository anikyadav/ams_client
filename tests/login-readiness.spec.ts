import { test, expect } from "@playwright/test";

const health = "**/health/ready?*";

test("a warm server does not show a startup message", async ({ page }) => {
  await page.route(health, (route) => route.fulfill({ json: { status: "ok" } }));
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await expect(page.getByText(/The server may be waking up/)).toHaveCount(0);
});

test("login waits for readiness and shows elapsed time only when slow", async ({ page }) => {
  let checks = 0;
  await page.route(health, (route) => {
    checks++;
    return route.fulfill({ status: checks === 1 ? 503 : 200, json: { status: checks === 1 ? "error" : "ok" } });
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await expect(page.getByText(/The server may be waking up/)).toBeVisible();
  await expect(page.getByText(/Time elapsed: 0:0/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: 10000 });
  expect(checks).toBe(2);
  await expect(page.getByText(/Time elapsed/)).toHaveCount(0);
});

test("a hanging readiness request stops after two minutes and Retry recovers", async ({ page }) => {
  await page.clock.install();
  let healthy = false;
  let checks = 0;
  await page.route(health, (route) => {
    checks++;
    if (healthy) return route.fulfill({ json: { status: "ok" } });
  });
  await page.goto("/login");
  await expect.poll(() => checks).toBe(1);
  await page.clock.fastForward(120000);
  await expect(page.getByRole("alert").filter({ hasText: "after two minutes" })).toBeVisible();
  const stoppedChecks = checks;
  await page.clock.fastForward(30000);
  expect(checks).toBe(stoppedChecks);
  healthy = true;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("invalid credentials display immediately without automatic retries", async ({ page }) => {
  let logins = 0;
  await page.route(health, (route) => route.fulfill({ json: { status: "ok" } }));
  await page.route("**/auth/login", (route) => {
    logins++;
    return route.fulfill({ status: 401, json: { message: "Unauthorized" } });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid email or password. Please try again.")).toBeVisible();
  expect(logins).toBe(1);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

for (const failure of ["network", "503", "timeout"]) {
  test(`login automatically recovers from ${failure} without refreshing`, async ({ page }) => {
    let logins = 0;
    await page.route("http://localhost:5000/**", (route) => route.fulfill({ json: [] }));
    await page.route(health, (route) => route.fulfill({ json: { status: "ok" } }));
    await page.route("**/auth/login", (route) => {
      logins++;
      if (logins === 1) {
        if (failure === "network") return route.abort("failed");
        if (failure === "503") return route.fulfill({ status: 503, json: {} });
        return;
      }
      return route.fulfill({ json: {
        accessToken: "test-token",
        user: { id: "staff", name: "Staff", email: "person@example.com", role: "STAFF" },
      } });
    });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("person@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(/We’ll sign you in automatically/)).toBeVisible();
    await expect(page.getByText(/Connection to the server failed/)).toHaveCount(0);
    await expect(page).toHaveURL(/\/tasks$/, { timeout: 25000 });
    expect(logins).toBe(2);
  });
}

test("persistent login failures stop at the deadline and Retry resubmits", async ({ page }) => {
  await page.clock.install();
  let logins = 0;
  await page.route(health, (route) => route.fulfill({ json: { status: "ok" } }));
  await page.route("**/auth/login", (route) => {
    logins++;
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => logins).toBe(1);
  await page.clock.fastForward(120000);
  await expect(page.getByText(/after two minutes/)).toBeVisible();
  const stopped = logins;
  await page.clock.fastForward(30000);
  expect(logins).toBe(stopped);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => logins).toBe(stopped + 1);
});


test("login supports password visibility and hides development account hints", async ({ page }) => {
  await page.route(health, (route) => route.fulfill({ json: { status: "ok" } }));
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("private-password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("private-password");
  await expect(page.getByText(/Development accounts|Seed accounts/)).toHaveCount(0);
  await page.screenshot({ path: "test-results/design-login.png", fullPage: true });
});
