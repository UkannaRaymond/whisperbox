"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket-provider";
import { useSession } from "@/lib/auth-client";
import * as OfflineDb from "@/features/offline/services/offline-db";
import { timelineQueryKey } from "./use-conversation-timeline";
import type { LocalMessage } from "@/features/offline/types/offline.types";
import type {
  MessageDeliveredPayload,
  MessageReadPayload,
  SocketAttachmentPayload,
  SocketMessagePayload,
} from "@/features/websocket/types/socket-events.types";

export function useRealtimeMessages() {
  const { socket } = useSocket();
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!socket) return;

    function handleAttachmentAdded(payload: SocketAttachmentPayload) {
      void queryClient.invalidateQueries({
        queryKey: ["attachments", "by-message", payload.messageId],
      });
    }

    async function handleNewMessage(payload: SocketMessagePayload) {
      const localMessage: LocalMessage = {
        ...payload,

        type: payload.type as LocalMessage["type"],
        status: payload.senderId === currentUserId ? "SENT" : "DELIVERED",
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

      if (!existing || existing.senderId !== currentUserId || existing.status === "READ") return;

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

      const toMark = messages.filter(
        (m) =>
          m.senderId === currentUserId &&
          m.status !== "READ" &&
          BigInt(m.sequenceNumber) <= BigInt(upToMessage.sequenceNumber),
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
    socket.on("attachment_added", handleAttachmentAdded);
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("message_read", handleMessageRead);
      socket.off("attachment_added", handleAttachmentAdded);
    };
  }, [currentUserId, socket, queryClient]);
}
