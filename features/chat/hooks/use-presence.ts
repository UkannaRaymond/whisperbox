"use client";

import * as React from "react";
import { usePresenceStore } from "../store/presence-store";

/**
 * Online presence (10-FRONTEND.md § UI Components: "Online Presence").
 *
 * Thin selector over the shared presence-store.ts — actual socket
 * subscription lives in use-presence-bridge.ts, mounted once at the app
 * root. Call this from as many components as you like (ConversationCard,
 * ConversationHeader, etc.); they all read the same state, so none of
 * them can miss the initial snapshot regardless of when they happen to
 * mount.
 */
export function usePresence() {
  const onlineUserIds = usePresenceStore((state) => state.onlineUserIds);

  const isOnline = React.useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds],
  );

  return { onlineUserIds, isOnline };
}
