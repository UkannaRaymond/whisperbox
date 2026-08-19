"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorState } from "@/components/shared/error-state";

export default function ErrorBoundary({
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
    <ErrorState
      title="This page hit a snag"
      description="Something went wrong while loading this page. Your messages remain encrypted either way — nothing was exposed."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
