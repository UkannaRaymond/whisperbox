"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket-provider";
import * as OfflineDb from "@/features/offline/services/offline-db";
import { timelineQueryKey } from "./use-conversation-timeline";
import type { LocalMessage } from "@/features/offline/types/offline.types";
import type {
  SocketMessagePayload,
  MessageDeliveredPayload,
  MessageReadPayload,
} from "@/features/websocket/types/socket-events.types";

/**
 * Bridges the real-time socket transport (Stage 08) into the offline-first
 * local cache (Stage 09): a `new_message` broadcast is persisted to
 * IndexedDB immediately, then the relevant conversation's TanStack Query
 * timeline is invalidated so it re-reads (including this message) without
 * waiting for the next poll or manual sync. Mount this once, near the app
 * root — it's not scoped to a single open conversation.
 *
 * Also bridges `message_delivered`/`message_read` the same way: both are
 * fully implemented server-side (server/socket/delivery.service.ts) but
 * previously had no client listener at all, so a message's local `status`
 * never advanced past whatever `new_message` initially set — chat bubbles
 * were stuck showing a single "sent" check forever, regardless of whether
 * the other person had actually read it.
 */
export function useRealtimeMessages() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!socket) return;

    async function handleNewMessage(payload: SocketMessagePayload) {
      // `new_message` only carries the wire subset of a message
      // (SocketMessagePayload) — the offline store needs the full
      // MessageResponseDto shape (LocalMessage). Fill in the fields the
      // socket doesn't send with the values that are true of any message
      // the instant it arrives over an open connection: it has reached
      // this client (DELIVERED), and it hasn't been edited, pinned, or
      // deleted. A later REST/sync fetch overwrites this with the
      // authoritative row if any of that ever changes server-side.
      const localMessage: LocalMessage = {
        ...payload,
        // SocketMessagePayload declares `type` as `string` (it's kept
        // self-contained, deliberately not importing the Zod-derived
        // MessageType union — see the file's top-of-file doc comment), but
        // the server only ever constructs it from an already-validated
        // Message row, so the value is always one of MessageType's members.
        type: payload.type as LocalMessage["type"],
        status: "DELIVERED",
        pinned: false,
        edited: false,
        editedAt: null,
        deleted: false,
        updatedAt: payload.createdAt,
      };

      await OfflineDb.putMessage(localMessage);
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(payload.conversationId) });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    async function handleMessageDelivered(payload: MessageDeliveredPayload) {
      const existing = await OfflineDb.getMessage(payload.messageId);
      // Never downgrade an already-READ message back to DELIVERED — reads
      // can race ahead of the delivery ack (e.g. the recipient's client
      // fetched and rendered the message via a REST pull before this
      // socket event happened to arrive).
      if (!existing || existing.status === "READ") return;

      await OfflineDb.putMessage({
        ...existing,
        status: "DELIVERED",
        updatedAt: payload.deliveredAt,
      });
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(payload.conversationId) });
    }

    async function handleMessageRead(payload: MessageReadPayload) {
      const messages = await OfflineDb.getMessagesForConversation(payload.conversationId);
      const upToMessage = messages.find((m) => m.id === payload.upToMessageId);
      if (!upToMessage) return;

      // "Read up to" is inclusive and covers everything at or before that
      // message in conversation order — createdAt sorts correctly here for
      // the same reason noted throughout offline-db.ts (sequenceNumber is a
      // stringified BigInt and doesn't).
      const toMark = messages.filter(
        (m) => m.status !== "READ" && m.createdAt <= upToMessage.createdAt,
      );
      if (toMark.length === 0) return;

      await OfflineDb.putMessages(
        toMark.map((m) => ({ ...m, status: "READ" as const, updatedAt: payload.readAt })),
      );
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(payload.conversationId) });
    }

    socket.on("new_message", handleNewMessage);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("message_read", handleMessageRead);
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("message_read", handleMessageRead);
    };
  }, [socket, queryClient]);
}
