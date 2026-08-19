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
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/features/websocket/types/socket-events.types";

interface SendMessageInput {
  conversationId: string;
  plaintext: string;
}

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** How long to wait for the server's `send_message` ack before giving up on the real-time path and falling back to the offline queue. */
const SOCKET_SEND_TIMEOUT_MS = 5_000;

class SocketAckTimeoutError extends Error {}

function toLocalMessage(payload: SocketMessagePayload): LocalMessage {
  return {
    ...payload,
    // SocketMessagePayload declares `type` as `string` (kept
    // self-contained — see that file's top-of-file comment), but the
    // server only ever constructs it from an already-validated Message
    // row, so it's always one of MessageType's members. Same cast
    // use-realtime-messages.ts makes for the `new_message` payload.
    type: payload.type as LocalMessage["type"],
    // The socket ack confirms the server persisted it; SENT is accurate
    // even though other recipients' own delivery/read state is tracked
    // separately via `message_delivered`/`message_read`.
    status: "SENT",
    pinned: false,
    edited: false,
    editedAt: null,
    deleted: false,
    updatedAt: payload.createdAt,
  };
}

function sendOverSocket(
  socket: AppClientSocket,
  payload: CreateMessageDto,
): Promise<{ ok: true; message: SocketMessagePayload } | { ok: false; error: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new SocketAckTimeoutError("send_message ack timed out"));
    }, SOCKET_SEND_TIMEOUT_MS);

    socket.emit("send_message", payload, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

/**
 * Composing and sending a message.
 *
 * Prefers the real-time Socket.IO transport (server/socket/handlers/
 * send-message.handler.ts) whenever the socket is connected: that's the
 * only path that actually broadcasts `new_message` to the other
 * recipients as it happens. The parallel REST path
 * (`POST /api/v1/messages`, used below as the offline-queue fallback)
 * creates the same row but pushes nothing to anyone — it exists for the
 * offline sync engine to drain its queue against once a connection comes
 * back, not for live delivery. Sending through it as the *primary* path
 * while online was why messages only ever showed up for the other person
 * after they refreshed.
 *
 * Falls back to the offline queue (features/offline/services/
 * queue-manager.ts, Stage 09) when the socket isn't connected, or if the
 * server doesn't ack the send within SOCKET_SEND_TIMEOUT_MS — enqueueing
 * first (so it shows up immediately via the timeline's merged
 * pending-operations view — "Optimistic UI"), then leaving it for the
 * retry scheduler/next reconnect to actually deliver.
 *
 * Encryption happens here, client-side, before anything is queued or
 * sent over either transport — neither the queue nor the socket payload
 * ever carries plaintext (09-OFFLINE-SYNC.md: "Never store plaintext
 * messages").
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
          const result = await sendOverSocket(socket, payload);

          if (!result.ok) {
            // The server actively rejected this (validation, membership,
            // etc.) — queuing it for retry would just fail the same way
            // forever, so surface the error instead of masking it.
            throw new Error(result.error);
          }

          await OfflineDb.putMessage(toLocalMessage(result.message));
          return clientMessageId;
        } catch (err) {
          if (!(err instanceof SocketAckTimeoutError)) throw err;
          // No ack in time — fall through to the offline queue below so
          // the message isn't lost, same as if we'd been offline the
          // whole time.
        }
      }

      await QueueManager.enqueueMessage(payload);

      // Best-effort immediate delivery attempt over REST; safe to ignore
      // failures here specifically because enqueueMessage already
      // guarantees the retry scheduler will pick this up later
      // regardless of why this attempt didn't succeed. Note this path
      // only delivers to the server — the recipient won't see it in
      // real time until their next pull, since it isn't going out over
      // the socket.
      await SyncEngine.pushPendingMessages().catch(() => {});

      return clientMessageId;
    },
    onSuccess: (_clientMessageId, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(conversationId) });
    },
  });
}
