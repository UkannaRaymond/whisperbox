"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket-provider";

/**
 * Marks the latest message in an open conversation as read
 * (server/socket/handlers/mark-read.handler.ts) — that handler and its
 * full downstream plumbing (delivery.service.ts, MessageReceipt /
 * ConversationMember.lastReadMessageId) already worked correctly; nothing
 * on the client ever called it, which is why unread badges never cleared
 * and sent messages never advanced past a single "sent" check mark.
 *
 * Fires once per distinct `latestMessageId` while the conversation stays
 * open — covers both the initial open (marks whatever was already there
 * as read) and any message that arrives while the user is actively
 * looking at the conversation, without re-sending for the same message on
 * every re-render.
 */
export function useMarkRead(conversationId: string | null, latestMessageId: string | null): void {
  const { socket, status } = useSocket();
  const queryClient = useQueryClient();
  const lastMarkedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!socket || status !== "connected") return;
    if (!conversationId || !latestMessageId) return;
    if (lastMarkedRef.current === latestMessageId) return;

    lastMarkedRef.current = latestMessageId;

    socket.emit("mark_read", { conversationId, messageId: latestMessageId }, (ok?: boolean) => {
      if (!ok) {
        // Let the next render (e.g. reconnect, or a newer message
        // arriving) retry rather than getting permanently stuck on a
        // failed attempt.
        lastMarkedRef.current = null;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [socket, status, conversationId, latestMessageId, queryClient]);
}
