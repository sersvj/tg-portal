import { test, expect, type Page } from "@playwright/test";

// Shared admin login helper
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? "admin@tayloegray.com");
  await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/);
}

test.describe("Admin — route protection", () => {
  test("admin dashboard loads after login", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("clients page is accessible", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/clients");
    await expect(page.getByRole("heading", { name: /clients/i })).toBeVisible();
  });

  test("milestones page is accessible", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/milestones");
    await expect(page.getByRole("heading", { name: /milestones/i })).toBeVisible();
  });

  test("new client form renders", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/clients/new");
    await expect(page.getByRole("heading", { name: /new client/i })).toBeVisible();
  });
});

test.describe("Admin — milestones management", () => {
  test("milestone types table renders", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/milestones");
    // Either the table or empty state should be present
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no milestone types/i).isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test("new definition form is visible", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/milestones");
    await expect(page.getByText(/new definition/i)).toBeVisible();
  });
});
