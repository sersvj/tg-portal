import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.TEST_CLIENT_EMAIL ?? "");
  await page.getByLabel(/password/i).fill(process.env.TEST_CLIENT_PASSWORD ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/portal/);
}

test.describe("Portal — route protection", () => {
  test("portal redirects client away from /admin", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/portal/);
  });
});

test.describe("Portal — dashboard", () => {
  test("portal page loads with milestone list or empty state", async ({ page }) => {
    await loginAsClient(page);
    await expect(page).toHaveURL(/\/portal/);
    const hasWelcome = await page.getByText(/welcome|onboarding|let's get/i).isVisible().catch(() => false);
    expect(hasWelcome).toBe(true);
  });

  test("portal header shows Tayloe/Gray branding", async ({ page }) => {
    await loginAsClient(page);
    await expect(page.getByText(/Tayloe/)).toBeVisible();
  });

  test("sign out button is present", async ({ page }) => {
    await loginAsClient(page);
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });
});
