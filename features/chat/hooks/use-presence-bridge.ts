"use client";

import * as React from "react";
import { useSocket } from "@/providers/socket-provider";
import { usePresenceStore } from "../store/presence-store";

/**
 * Feeds features/chat/store/presence-store.ts from the socket connection.
 * Mount exactly once, near the app root (app/(app)/layout.tsx, alongside
 * useRealtimeMessages()) — NOT inside individual conversation components.
 * See presence-store.ts's doc comment for why per-component subscriptions
 * caused the online indicator to show "Offline" incorrectly.
 */
export function usePresenceBridge(): void {
  const { socket } = useSocket();
  const mergeSnapshot = usePresenceStore((state) => state.mergeSnapshot);
  const setOnline = usePresenceStore((state) => state.setOnline);
  const setOffline = usePresenceStore((state) => state.setOffline);

  React.useEffect(() => {
    if (!socket) return;

    function handleAuthenticated(payload: { userId: string; onlineUserIds: string[] }) {
      mergeSnapshot(payload.onlineUserIds);
    }

    function handleOnline(payload: { userId: string }) {
      setOnline(payload.userId);
    }

    function handleOffline(payload: { userId: string }) {
      setOffline(payload.userId);
    }

    socket.on("authenticated", handleAuthenticated);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);

    return () => {
      socket.off("authenticated", handleAuthenticated);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
    };
  }, [socket, mergeSnapshot, setOnline, setOffline]);
}
