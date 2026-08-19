"use client";

import * as React from "react";
import { useSocket } from "@/providers/socket-provider";

const STOP_TYPING_DEBOUNCE_MS = 2_000;
/** Client-side safety net matching the server's own TTL (server/socket/typing.service.ts) — in case a `typing_stop`/disconnect is missed. */
const REMOTE_TYPING_EXPIRY_MS = 6_000;

/**
 * Typing indicators (10-FRONTEND.md § UI Components: "Typing Indicator"),
 * wired to the real Socket.IO gateway built in Stage 08
 * (server/socket/handlers/typing.handler.ts) — not a placeholder. Reads
 * the socket via `useSocket()` (providers/socket-provider.tsx) rather
 * than modifying that provider, per this stage's "do not modify... the
 * websocket implementation" constraint.
 */
export function useTyping(conversationId: string | null) {
  const { socket } = useSocket();
  const [typingUserIds, setTypingUserIds] = React.useState<Set<string>>(new Set());
  const stopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  React.useEffect(() => {
    if (!socket || !conversationId) return;

    // Captured once per effect run so the cleanup below always clears the
    // same map it was scheduling timers into — `expiryTimersRef.current`
    // is a mutable ref, so reading it again inside the cleanup closure
    // could see a different Map than the one this effect actually used.
    const expiryTimers = expiryTimersRef.current;

    function handleTyping(payload: { conversationId: string; userId: string; isTyping: boolean }) {
      if (payload.conversationId !== conversationId) return;

      setTypingUserIds((prev) => {
        const next = new Set(prev);
        if (payload.isTyping) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });

      const existingTimer = expiryTimers.get(payload.userId);
      if (existingTimer) clearTimeout(existingTimer);

      if (payload.isTyping) {
        const timer = setTimeout(() => {
          setTypingUserIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.userId);
            return next;
          });
        }, REMOTE_TYPING_EXPIRY_MS);
        expiryTimers.set(payload.userId, timer);
      }
    }

    socket.on("typing", handleTyping);
    return () => {
      socket.off("typing", handleTyping);
      for (const timer of expiryTimers.values()) clearTimeout(timer);
      expiryTimers.clear();
    };
  }, [socket, conversationId]);

  /** Call on every composer keystroke — debounces `typing_stop` so it doesn't fire on every character. */
  const notifyTyping = React.useCallback(() => {
    if (!socket || !conversationId) return;

    socket.emit("typing_start", { conversationId });

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId });
    }, STOP_TYPING_DEBOUNCE_MS);
  }, [socket, conversationId]);

  const notifyStoppedTyping = React.useCallback(() => {
    if (!socket || !conversationId) return;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    socket.emit("typing_stop", { conversationId });
  }, [socket, conversationId]);

  React.useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  return { typingUserIds, notifyTyping, notifyStoppedTyping };
}
