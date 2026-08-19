// @vitest-environment node
//
// config/env.ts computes `export const env` at module-eval time based on
// `typeof window === "undefined"` — under vitest's default jsdom
// environment `window` IS defined, so the server schema would never
// actually run and this test would silently test nothing. The pragma
// above forces Node's environment for this file only, matching how the
// real server processes (Next.js server runtime, the socket gateway)
// actually load it.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const REQUIRED_BASE_ENV = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@host:5432/db",
  REDIS_URL: "rediss://default:pass@host:6379",
  AUTH_SECRET: "a".repeat(32),
  AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_SOCKET_URL: "http://localhost:4001",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

const ENV_KEYS = [
  ...Object.keys(REQUIRED_BASE_ENV),
  "R2_BUCKET",
  "R2_ACCESS_KEY",
  "R2_SECRET_KEY",
  "R2_ENDPOINT",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
];

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

/** Sets process.env from a plain object, re-imports config/env fresh, and returns the result. */
async function loadEnvWith(overrides: Record<string, string>) {
  Object.assign(process.env, REQUIRED_BASE_ENV, overrides);
  vi.resetModules();
  return import("@/config/env");
}

describe("config/env.ts — server env validation", () => {
  it("loads successfully with only the required vars set", async () => {
    const { env } = await loadEnvWith({});
    expect(env.DATABASE_URL).toBe(REQUIRED_BASE_ENV.DATABASE_URL);
  });

  // Regression test: this exact bug shipped twice — once for the
  // `.url()`-validated optional fields (SENTRY_DSN, R2_ENDPOINT), then
  // again for the `.min(1)`-validated ones (R2_BUCKET, R2_ACCESS_KEY,
  // R2_SECRET_KEY). A `.env` file that declares a var but leaves it
  // blank (`R2_BUCKET=`) produces `""`, not `undefined` — `.optional()`
  // alone doesn't protect against that.
  it("treats a blank R2_BUCKET/R2_ACCESS_KEY/R2_SECRET_KEY/R2_ENDPOINT the same as unset, outside production", async () => {
    const { env } = await loadEnvWith({
      R2_BUCKET: "",
      R2_ACCESS_KEY: "",
      R2_SECRET_KEY: "",
      R2_ENDPOINT: "",
    });

    expect(env.R2_BUCKET).toBeUndefined();
    expect(env.R2_ACCESS_KEY).toBeUndefined();
    expect(env.R2_SECRET_KEY).toBeUndefined();
    expect(env.R2_ENDPOINT).toBeUndefined();
  });

  it("treats a blank SENTRY_DSN the same as unset", async () => {
    const { env } = await loadEnvWith({ SENTRY_DSN: "" });
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("accepts real R2 values when they are provided", async () => {
    const { env } = await loadEnvWith({
      R2_BUCKET: "my-bucket",
      R2_ACCESS_KEY: "access-key",
      R2_SECRET_KEY: "secret-key",
      R2_ENDPOINT: "https://abc123.r2.cloudflarestorage.com",
    });

    expect(env.R2_BUCKET).toBe("my-bucket");
    expect(env.R2_ENDPOINT).toBe("https://abc123.r2.cloudflarestorage.com");
  });

  it("rejects a syntactically invalid R2_ENDPOINT (e.g. a literal unfilled placeholder)", async () => {
    await expect(
      loadEnvWith({ R2_ENDPOINT: "https://<account-id>.r2.cloudflarestorage.com" }),
    ).rejects.toThrow(/R2_ENDPOINT/);
  });

  it("requires DATABASE_URL", async () => {
    await expect(loadEnvWith({ DATABASE_URL: "" })).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires AUTH_SECRET to be at least 32 characters", async () => {
    await expect(loadEnvWith({ AUTH_SECRET: "too-short" })).rejects.toThrow(/AUTH_SECRET/);
  });

  // The other half of the fix: R2 is optional in development but must
  // not be silently missing in a real production deploy.
  it("requires all four R2 vars once NODE_ENV=production", async () => {
    await expect(loadEnvWith({ NODE_ENV: "production" })).rejects.toThrow(
      /R2_BUCKET.*R2_ACCESS_KEY.*R2_SECRET_KEY.*R2_ENDPOINT/s,
    );
  });

  it("passes in production when all four R2 vars are set", async () => {
    const { env } = await loadEnvWith({
      NODE_ENV: "production",
      R2_BUCKET: "prod-bucket",
      R2_ACCESS_KEY: "access-key",
      R2_SECRET_KEY: "secret-key",
      R2_ENDPOINT: "https://abc123.r2.cloudflarestorage.com",
    });

    expect(env.R2_BUCKET).toBe("prod-bucket");
  });
});
