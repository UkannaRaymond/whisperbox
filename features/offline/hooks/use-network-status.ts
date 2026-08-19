"use client";

import * as React from "react";
import {
  getNetworkStatus,
  onNetworkStatusChange,
  startNetworkMonitor,
  type NetworkStatus,
} from "../services/network-monitor";

/**
 * React hook wrapper around the network monitor built in Stage 09
 * (features/offline/services/network-monitor.ts) — that module is
 * intentionally framework-agnostic (plain subscribe/unsubscribe), so this
 * is a new, additive file rather than a modification to it.
 */
export function useNetworkStatus() {
  const [status, setStatus] = React.useState<NetworkStatus>(getNetworkStatus());

  React.useEffect(() => {
    startNetworkMonitor();
    return onNetworkStatusChange(setStatus);
  }, []);

  return { status, isOnline: status === "online" };
}
