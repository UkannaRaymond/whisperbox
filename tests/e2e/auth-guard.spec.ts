import { test, expect } from "@playwright/test";

test.describe("unauthenticated access to protected routes", () => {
  test("visiting /conversations without a session redirects to /login, not a crash", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];

    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/conversations");

    await expect(page).toHaveURL(/\/login$/);

    expect(pageErrors).toHaveLength(0);
  });

  test("visiting /onboarding/username without a session redirects to /login", async ({ page }) => {
    await page.goto("/onboarding/username");

    await expect(page).toHaveURL(/\/login$/);
  });
});
