import { test, expect } from "@playwright/test";
test("landing page renders and links to register/login", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /messaging that stays between you and them/i }),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: /get started/i })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(page.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
});

test("health check endpoint responds with the expected shape", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = await response.json();

  expect([200, 503]).toContain(response.status());
  expect(typeof body.success).toBe("boolean");
  expect(["ok", "degraded"]).toContain(body.data.status);
  expect(body.data.checks).toEqual({
    database: expect.stringMatching(/^(ok|error)$/),
    redis: expect.stringMatching(/^(ok|error)$/),
  });
});
