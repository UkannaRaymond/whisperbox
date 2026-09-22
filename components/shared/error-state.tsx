"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  digest?: string;
}

/**
 * Shared error-state UI. Every feature's "error state" should render this rather than inventing
 * its own error layout, so the app has one consistent error voice.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "That didn't work as expected. You can try again, and if it keeps happening, let us know.",
  onRetry,
  digest,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try again
        </Button>
      )}
      {digest && <p className="text-muted-foreground/70 font-mono text-xs">Reference: {digest}</p>}
    </div>
  );
}
