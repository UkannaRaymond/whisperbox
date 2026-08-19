import {
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_JITTER_FACTOR,
  RETRY_MAX_ATTEMPTS,
  RETRY_SCHEDULER_INTERVAL_MS,
} from "../constants/offline.constants";

/**
 * Retry scheduler (09-OFFLINE-SYNC.md § Deliverables: "Retry scheduler").
 * Pure backoff-calculation functions plus a small polling loop that calls
 * back into whatever "attempt due retries" logic is supplied — deliberately
 * decoupled from the queue/sync engine so this module can be tested (and
 * reasoned about) independently of IndexedDB or network calls.
 */

/**
 * Exponential backoff with jitter: `base * 2^attempt`, capped at
 * `RETRY_MAX_DELAY_MS`, then randomized by +/- `RETRY_JITTER_FACTOR` so
 * many clients reconnecting after the same outage don't all retry in
 * lockstep against the server at once.
 */
export function computeBackoffDelayMs(attempt: number): number {
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt));
  const capped = Math.min(exponential, RETRY_MAX_DELAY_MS);
  const jitterRange = capped * RETRY_JITTER_FACTOR;
  const jitter = jitterRange * (Math.random() * 2 - 1); // uniform in [-jitterRange, +jitterRange]
  return Math.max(0, Math.round(capped + jitter));
}

export function computeNextRetryAt(attempt: number, now: Date = new Date()): string {
  return new Date(now.getTime() + computeBackoffDelayMs(attempt)).toISOString();
}

/** Once an item has failed this many times, it stops being auto-retried (09-OFFLINE-SYNC.md: queue items land in FAILED for the caller to decide, rather than retrying forever). */
export function hasExceededMaxAttempts(attempts: number): boolean {
  return attempts >= RETRY_MAX_ATTEMPTS;
}

export function isDue(nextRetryAt: string | undefined, now: Date = new Date()): boolean {
  if (!nextRetryAt) return true;
  return new Date(nextRetryAt).getTime() <= now.getTime();
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Starts a polling loop that invokes `onTick` every
 * `RETRY_SCHEDULER_INTERVAL_MS` — the caller (sync-engine.ts) is
 * responsible for checking which queue items are actually due
 * (`isDue`) and attempting them; this module only owns the timing.
 * Safe to call again: replaces any previous loop rather than stacking a
 * second one.
 */
export function startRetryScheduler(onTick: () => void | Promise<void>): void {
  stopRetryScheduler();
  intervalHandle = setInterval(() => void onTick(), RETRY_SCHEDULER_INTERVAL_MS);
}

export function stopRetryScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
