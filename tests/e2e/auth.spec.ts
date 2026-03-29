import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("redirects unauthenticated users away from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users away from /portal", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
  });

  test("invalid invite token shows error", async ({ page }) => {
    await page.goto("/invite/invalid-token-xyz");
    await expect(page.getByText(/invalid|unavailable/i)).toBeVisible();
  });
});
