import { test, expect } from "@playwright/test";

test("login waits for readiness and retries a database-unavailable response", async ({ page }) => {
  let checks = 0;
  await page.route("**/health/ready?*", (route) => {
    checks++;
    return route.fulfill({ status: checks === 1 ? 503 : 200, json: { status: checks === 1 ? "error" : "ok" } });
  });
  await page.goto("/login");
  await expect(page.getByText("Starting the server. This may take about a minute…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: 10000 });
  expect(checks).toBe(2);
});

test("a hanging readiness request stops after two minutes and Retry recovers", async ({ page }) => {
  await page.clock.install();
  let healthy = false;
  let checks = 0;
  await page.route("**/health/ready?*", (route) => {
    checks++;
    if (healthy) return route.fulfill({ json: { status: "ok" } });
    // Leave the request unanswered to exercise the overall deadline.
  });
  await page.goto("/login");
  await expect.poll(() => checks).toBe(1);
  await page.clock.fastForward(120000);
  await expect(page.getByRole("alert").filter({ hasText: "after two minutes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  const stoppedChecks = checks;
  await page.clock.fastForward(30000);
  expect(checks).toBe(stoppedChecks);
  healthy = true;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("invalid credentials stay separate from connection failures", async ({ page }) => {
  await page.route("**/health/ready?*", (route) => route.fulfill({ json: { status: "ok" } }));
  let disconnected = false;
  await page.route("**/auth/login", (route) => disconnected
    ? route.abort("failed")
    : route.fulfill({ status: 401, json: { message: "Unauthorized" } }));
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  await signIn.click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password. Please try again." })).toBeVisible();
  await expect(signIn).toBeEnabled();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
  disconnected = true;
  await signIn.click();
  await expect(page.getByRole("alert").filter({ hasText: "Connection to the server failed" })).toBeVisible();
  await expect(signIn).toBeDisabled();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(signIn).toBeEnabled();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("person@example.com");
});
