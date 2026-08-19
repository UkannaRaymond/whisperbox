import { test, expect } from "@playwright/test";

/**
 * Regression coverage for a real bug hit in this session: `app/(app)/layout.tsx`
 * had no auth guard at all, so an unauthenticated visit to `/conversations`
 * mounted the offline sync engine immediately, which called the REST API,
 * got a 401, and threw an uncaught "Authentication required" runtime
 * error instead of redirecting to `/login`.
 */
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
    // Not itself under the (app) route group's guard, but should still
    // require a session — there's no username to set for a signed-out
    // visitor.
    await page.goto("/onboarding/username");
    await expect(page).toHaveURL(/\/login$/);
  });
});
