"use client";

import * as React from "react";
import { useSocket } from "@/providers/socket-provider";
import { usePresenceStore } from "../store/presence-store";

export function usePresenceBridge(): void {
  const { socket } = useSocket();

  const setSnapshot = usePresenceStore((state) => state.setSnapshot);
  const setOnline = usePresenceStore((state) => state.setOnline);
  const setOffline = usePresenceStore((state) => state.setOffline);
  const clear = usePresenceStore((state) => state.clear);

  React.useEffect(() => {
    if (!socket) return;

    function handleAuthenticated(payload: { userId: string; onlineUserIds: string[] }) {
      setSnapshot(payload.onlineUserIds);
    }

    function handleOnline(payload: { userId: string }) {
      setOnline(payload.userId);
    }

    function handleOffline(payload: { userId: string }) {
      setOffline(payload.userId);
    }

    function handleDisconnect() {
      clear();
    }

    socket.on("authenticated", handleAuthenticated);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("authenticated", handleAuthenticated);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, setSnapshot, setOnline, setOffline, clear]);
}
