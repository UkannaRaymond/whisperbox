"use client";

import * as React from "react";
import { startSyncEngine, stopSyncEngine } from "../services/sync-engine";
import { startNetworkMonitor, stopNetworkMonitor } from "../services/network-monitor";

/**
 * Starts the Stage 09 sync engine + network monitor for the lifetime of
 * the authenticated app shell. New, additive hook — services/sync-engine.ts
 * and services/network-monitor.ts are untouched.
 *
 * `enabled` (default `true`) gates this: `app/(app)/layout.tsx` passes
 * `false` until a session is confirmed, so this never fires while signed
 * out. Without that gate, mounting this before auth resolves makes
 * `startSyncEngine`'s online-transition listener fire `runFullSync()`
 * immediately, which calls the REST API and throws an uncaught
 * "Authentication required" error (features/offline/services/sync-engine.ts)
 * instead of failing quietly.
 */
export function useSyncEngine(enabled: boolean = true) {
  React.useEffect(() => {
    if (!enabled) return;

    startNetworkMonitor();
    startSyncEngine();
    return () => {
      stopSyncEngine();
      stopNetworkMonitor();
    };
  }, [enabled]);
}
