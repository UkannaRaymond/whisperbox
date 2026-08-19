import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Application-wide structured logger.
 *
 * Per the TRD, logs must never contain passwords, private keys, plaintext
 * message bodies, or auth tokens. `redact` strips these paths defensively
 * even if a caller accidentally passes them in.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
      "privateKey",
      "*.privateKey",
      "message",
      "*.message.body",
      "plaintext",
      "*.plaintext",
      "authorization",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
  base: {
    service: "whisperbox",
    env: process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger scoped to a module or request, e.g.
 * `createLogger("auth")` or `createLogger({ requestId })`.
 */
export function createLogger(bindings: string | Record<string, unknown>) {
  const scope = typeof bindings === "string" ? { module: bindings } : bindings;
  return logger.child(scope);
}
