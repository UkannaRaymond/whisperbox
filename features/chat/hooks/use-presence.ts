"use client";

import * as React from "react";
import { usePresenceStore } from "../store/presence-store";

export function usePresence() {
  const onlineUserIds = usePresenceStore((state) => state.onlineUserIds);

  const isOnline = React.useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds],
  );

  return { onlineUserIds, isOnline };
}
