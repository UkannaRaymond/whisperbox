"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as CryptoService from "@/features/encryption/services/crypto.service";
import * as QueueManager from "@/features/offline/services/queue-manager";
import * as SyncEngine from "@/features/offline/services/sync-engine";
import * as OfflineDb from "@/features/offline/services/offline-db";
import { resolveRecipientKeys } from "../utils/resolve-recipient-keys";
import { timelineQueryKey } from "./use-conversation-timeline";
import { useSocket } from "@/providers/socket-provider";
import type { LocalMessage } from "@/features/offline/types/offline.types";
import type { SocketMessagePayload } from "@/features/websocket/types/socket-events.types";
import type { CreateMessageDto } from "@/schemas/message.schema";

import {
  sendMessageOverSocket,
  SocketAckTimeoutError,
} from "@/features/websocket/utils/socket-send";

interface SendMessageInput {
  conversationId: string;
  plaintext: string;
}

function toLocalMessage(payload: SocketMessagePayload): LocalMessage {
  return {
    ...payload,

    type: payload.type as LocalMessage["type"],

    pinned: false,
    edited: false,
    editedAt: null,
    deleted: false,
    updatedAt: payload.createdAt,
    status: "SENT",
  };
}

/**
 * Encrypts a message on the client, prefers the Socket.IO transport while connected,
 * and queues it for REST-based retry when real-time delivery is unavailable.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { socket, status: socketStatus } = useSocket();

  return useMutation({
    mutationFn: async ({ conversationId, plaintext }: SendMessageInput) => {
      const recipients = await resolveRecipientKeys(conversationId);

      const encrypted = await CryptoService.encryptForRecipients(
        plaintext,
        recipients.map((r) => ({ id: r.recipientId, publicKey: r.publicKey })),
      );

      const clientMessageId = crypto.randomUUID();

      const payload: CreateMessageDto = {
        conversationId,
        clientMessageId,
        type: "TEXT",
        encryptedContent: encrypted.ciphertext,
        nonce: encrypted.nonce,
        encryptionVersion: encrypted.encryptionVersion,
        encryptedKeys: encrypted.wrappedKeys.map((key) => ({
          recipientId: key.recipientId,
          encryptedKey: key.wrappedKey,
          algorithm: key.algorithm,
        })),
      };

      if (socket && socketStatus === "connected") {
        try {
          const result = await sendMessageOverSocket(socket, payload);

          if (!result.ok) {
            throw new Error(result.error);
          }

          await OfflineDb.putMessage(toLocalMessage(result.message));
          return clientMessageId;
        } catch (err) {
          if (!(err instanceof SocketAckTimeoutError)) throw err;
          // No ack in time — fall through to the offline queue.
        }
      }

      await QueueManager.enqueueMessage(payload);

      await SyncEngine.pushPendingMessages().catch(() => {});

      return clientMessageId;
    },
    onSuccess: (_clientMessageId, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(conversationId) });
    },
  });
}
