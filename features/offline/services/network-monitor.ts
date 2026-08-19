import {
  HEALTH_CHECK_PATH,
  HEALTH_CHECK_TIMEOUT_MS,
  HEALTH_CHECK_INTERVAL_MS,
} from "../constants/offline.constants";

/**
 * Network status detection (09-OFFLINE-SYNC.md § Core Features: "Network
 * status detection").
 *
 * `navigator.onLine` alone is well known to be unreliable — it reflects
 * whether the OS/browser thinks a network interface is up, not whether
 * the actual API is reachable (e.g. connected to Wi-Fi with no real
 * internet, or a captive portal, both report `onLine: true`). This module
 * treats `navigator.onLine`/the `online`/`offline` events as a fast
 * *hint* that triggers an immediate re-check, and an active health-check
 * ping against `/api/health` (already built — see app/api/health/route.ts)
 * as the actual source of truth for "can we reach the server."
 */

export type NetworkStatus = "online" | "offline";
type Listener = (status: NetworkStatus) => void;

let currentStatus: NetworkStatus = "offline";
let intervalHandle: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function assertBrowserEnvironment(): void {
  if (typeof window === "undefined") {
    throw new Error(
      "Network monitor requires a browser environment (this code must not run server-side).",
    );
  }
}

async function checkReachability(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    // Trust the OS-level signal when it says "definitely offline" — no
    // point spending a request confirming what the network stack already
    // knows. Only a `true` from `navigator.onLine` needs the real check.
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(HEALTH_CHECK_PATH, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function setStatus(status: NetworkStatus): void {
  if (status === currentStatus) return;
  currentStatus = status;
  for (const listener of listeners) listener(status);
}

async function refresh(): Promise<void> {
  const reachable = await checkReachability();
  setStatus(reachable ? "online" : "offline");
}

/** Starts monitoring: an immediate check, a periodic re-check, and fast-path re-checks on the browser's own online/offline events. Call once (e.g. at app startup); safe to call again (idempotent) since it only replaces the previous interval/listeners. */
export function startNetworkMonitor(): void {
  assertBrowserEnvironment();
  stopNetworkMonitor();

  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);

  intervalHandle = setInterval(() => void refresh(), HEALTH_CHECK_INTERVAL_MS);
  void refresh();
}

export function stopNetworkMonitor(): void {
  if (typeof window !== "undefined") {
    window.removeEventListener("online", refresh);
    window.removeEventListener("offline", refresh);
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

export function isOnline(): boolean {
  return currentStatus === "online";
}

/** Subscribes to status changes. Returns an unsubscribe function. Does NOT fire immediately with the current status — call `getNetworkStatus()` for that. */
export function onNetworkStatusChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forces an immediate reachability check outside the regular interval — e.g. right before the sync engine attempts a push, so it doesn't wait up to `HEALTH_CHECK_INTERVAL_MS` for stale state to catch up. */
export async function checkNetworkNow(): Promise<NetworkStatus> {
  await refresh();
  return currentStatus;
}
