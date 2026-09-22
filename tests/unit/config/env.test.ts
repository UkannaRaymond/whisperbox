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
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
  "R2_BUCKET",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
];

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
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

  // Regression test: blank optional storage variables should be treated
  // the same as unset outside production. A `.env` file that declares
  // `AWS_ACCESS_KEY_ID=` produces an empty string, not `undefined`.
  it("treats blank storage variables the same as unset, outside production", async () => {
    const { env } = await loadEnvWith({
      R2_BUCKET: "",
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
      AWS_ENDPOINT_URL_S3: "",
      AWS_REGION: "",
    });

    expect(env.R2_BUCKET).toBeUndefined();
    expect(env.AWS_ACCESS_KEY_ID).toBeUndefined();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.AWS_ENDPOINT_URL_S3).toBeUndefined();
    expect(env.AWS_REGION).toBeUndefined();
  });

  it("treats a blank SENTRY_DSN the same as unset", async () => {
    const { env } = await loadEnvWith({
      SENTRY_DSN: "",
    });

    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("accepts real Neon Object Storage values when they are provided", async () => {
    const { env } = await loadEnvWith({
      R2_BUCKET: "whisperbox-attachments",
      AWS_ACCESS_KEY_ID: "access-key",
      AWS_SECRET_ACCESS_KEY: "secret-key",
      AWS_ENDPOINT_URL_S3: "https://storage.example.com",
      AWS_REGION: "aws-eu-central-1",
    });

    expect(env.R2_BUCKET).toBe("whisperbox-attachments");
    expect(env.AWS_ACCESS_KEY_ID).toBe("access-key");
    expect(env.AWS_SECRET_ACCESS_KEY).toBe("secret-key");
    expect(env.AWS_ENDPOINT_URL_S3).toBe("https://storage.example.com");
    expect(env.AWS_REGION).toBe("aws-eu-central-1");
  });

  it("rejects a syntactically invalid AWS_ENDPOINT_URL_S3", async () => {
    await expect(
      loadEnvWith({
        AWS_ENDPOINT_URL_S3: "not-a-valid-url",
      }),
    ).rejects.toThrow(/AWS_ENDPOINT_URL_S3/);
  });

  it("requires DATABASE_URL", async () => {
    await expect(
      loadEnvWith({
        DATABASE_URL: "",
      }),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires AUTH_SECRET to be at least 32 characters", async () => {
    await expect(
      loadEnvWith({
        AUTH_SECRET: "too-short",
      }),
    ).rejects.toThrow(/AUTH_SECRET/);
  });

  // Neon Object Storage is optional during development but must not be
  // silently missing in a real production deployment.
  it("requires all storage vars once NODE_ENV=production", async () => {
    await expect(
      loadEnvWith({
        NODE_ENV: "production",
      }),
    ).rejects.toThrow(
      /R2_BUCKET.*AWS_ACCESS_KEY_ID.*AWS_SECRET_ACCESS_KEY.*AWS_ENDPOINT_URL_S3.*AWS_REGION/s,
    );
  });

  it("passes in production when all storage vars are set", async () => {
    const { env } = await loadEnvWith({
      NODE_ENV: "production",
      R2_BUCKET: "whisperbox-attachments",
      AWS_ACCESS_KEY_ID: "access-key",
      AWS_SECRET_ACCESS_KEY: "secret-key",
      AWS_ENDPOINT_URL_S3: "https://storage.example.com",
      AWS_REGION: "aws-eu-central-1",
    });

    expect(env.R2_BUCKET).toBe("whisperbox-attachments");
  });
});
