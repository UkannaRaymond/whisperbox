import { z } from "zod";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());
const optionalString = z.preprocess(blankToUndefined, z.string().min(1).optional());

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .url("DATABASE_URL must be a valid connection string"),

    REDIS_URL: z
      .string()
      .min(1, "REDIS_URL is required")
      .url("REDIS_URL must be a valid connection string"),

    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),

    AUTH_URL: z.string().url("AUTH_URL must be a valid URL"),

    // Neon Object Storage (S3-compatible)
    AWS_ACCESS_KEY_ID: optionalString,
    AWS_SECRET_ACCESS_KEY: optionalString,
    AWS_ENDPOINT_URL_S3: optionalUrl,
    AWS_REGION: optionalString,

    // Neon Object Storage bucket
    R2_BUCKET: optionalString,

    SENTRY_DSN: optionalUrl,
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),

    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("info"),

    // Port the standalone Socket.IO gateway process listens on.
    SOCKET_PORT: z.coerce.number().int().positive().default(4001),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    const requiredStorageVars = (
      [
        "R2_BUCKET",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_ENDPOINT_URL_S3",
        "AWS_REGION",
      ] as const
    ).filter((key) => !value[key]);

    for (const key of requiredStorageVars) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required in production (attachment storage)`,
      });
    }
  });

/**
 * Client-side environment variables.
 *
 * Only variables prefixed with NEXT_PUBLIC_ are inlined into the client
 * bundle by Next.js — anything else here would silently be `undefined`
 * in the browser, so the two schemas are kept explicitly separate.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SOCKET_URL: z.string().url("NEXT_PUBLIC_SOCKET_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}

function loadClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  if (!parsed.success) {
    throw new Error(`Invalid client environment variables:\n${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}

/**
 * Validated server environment. Importing this anywhere in client code is a
 * mistake by construction: `DATABASE_URL` etc. are not defined in the
 * browser, so `env.DATABASE_URL` will throw immediately rather than leak
 * `undefined` into a code path that assumes it's set.
 */
export const env: ServerEnv =
  typeof window === "undefined" ? loadServerEnv() : (undefined as never);

/**
 * Validated client environment. Safe to import from both client and server
 * code.
 */
export const clientEnv: ClientEnv = loadClientEnv();
