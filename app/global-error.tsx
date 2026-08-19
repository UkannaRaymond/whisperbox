"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Catches errors thrown by the root layout itself. Because it replaces
 * the root layout entirely while active, it must render its own
 * <html>/<body> and cannot rely on global styles or providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>WhisperBox couldn&rsquo;t load</h1>
        <p style={{ color: "#5b6072", maxWidth: 320 }}>
          Something went wrong at the application level. Please try reloading the page.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: 6,
            border: "1px solid #e1e3e9",
            padding: "0.5rem 1rem",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
