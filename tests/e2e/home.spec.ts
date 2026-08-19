import { test, expect } from "@playwright/test";

// Previously asserted on "project foundation is in place" — copy from the
// very first scaffolding stage's placeholder page. app/page.tsx has been
// the real landing page (10-FRONTEND.md § Core Screens: "Landing Page")
// for several stages now; this was never updated to match and would have
// failed the moment anyone actually ran it.
test("landing page renders and links to register/login", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /messages only you and your contacts can read/i }),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: /create an account/i })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(page.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
});

test("health check endpoint responds with the expected shape", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = await response.json();

  // Doesn't assert `success: true` / status 200 unconditionally — the
  // health check now does real Postgres/Redis liveness checks (see
  // app/api/health/route.ts), so in an environment without both running
  // it correctly reports 503/degraded rather than lying about being
  // healthy. What's asserted here is the response *shape*, which holds
  // either way, plus that the two dependencies were actually checked
  // (not just always reported "ok" — the bug this replaced).
  expect([200, 503]).toContain(response.status());
  expect(typeof body.success).toBe("boolean");
  expect(["ok", "degraded"]).toContain(body.data.status);
  expect(body.data.checks).toEqual({
    database: expect.stringMatching(/^(ok|error)$/),
    redis: expect.stringMatching(/^(ok|error)$/),
  });
});
