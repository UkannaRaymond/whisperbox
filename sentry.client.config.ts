import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Keep sampling conservative by default; tune per-environment once real
  // traffic patterns are known.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay is opt-in and off by default until a privacy review of
  // the encrypted-message UI has taken place.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  enabled: process.env.NODE_ENV === "production",

  beforeSend(event) {
    // Defense in depth: strip request bodies and cookies so no ciphertext,
    // tokens, or plaintext ever reach Sentry even if a rule elsewhere misses
    // it.
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
    }
    return event;
  },
});
