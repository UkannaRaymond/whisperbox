import type { captureRequestError } from "@sentry/nextjs";

/**
 * `config/env.ts` was written to "fail fast" at process start (see its
 * own doc comment) but was never actually imported anywhere the main
 * Next.js app runs — only referenced in a comment in
 * server/socket/index.ts. That meant a missing/invalid env var (e.g. a
 * malformed DATABASE_URL) surfaced as a confusing runtime error deep
 * inside whatever request handler happened to touch it first, instead of
 * a clear message at boot. `instrumentation.ts`'s `register()` runs once,
 * before the server starts accepting requests
 * (https://nextjs.org/docs/app/guides/instrumentation), making it the
 * right place for that fail-fast check. Importing `config/env` runs its
 * `serverEnvSchema.safeParse` at module-eval time, throwing immediately
 * if anything's missing/invalid — Next.js surfaces that as a boot-time
 * crash with the formatted Zod error, not a stack trace from wherever
 * `env.SOMETHING` first got read.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./config/env");
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: typeof captureRequestError = async (...args) => {
  const { captureRequestError: capture } = await import("@sentry/nextjs");
  return capture(...args);
};
