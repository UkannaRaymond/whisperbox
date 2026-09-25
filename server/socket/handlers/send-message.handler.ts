import { ZodError } from "zod";
import { createLogger } from "../../logger";
import { messageService } from "../../../services";
import { notifyRecipientsOfNewMessage } from "../../../services/message.service";
import { createMessageSchema } from "../../../schemas/message.schema";
import {
  registerRecipients,
  checkOnlineRecipients,
  acknowledgeDelivery,
} from "../delivery.service";
import { userRoom } from "../rooms";
import type { AppSocket, AppServer } from "../socket-auth";
import type { SocketMessagePayload } from "../../../features/websocket/types/socket-events.types";

const log = createLogger("socket:handler:send-message");

function toSocketPayload(
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    clientMessageId: string;
    type: string;
    encryptedContent: string;
    nonce: string;
    encryptionVersion: number;
    replyToMessageId: string | null;
    sequenceNumber: string;
    createdAt: string;
  },
  encryptedKeyForMe: string | null,
): SocketMessagePayload {
  return { ...message, encryptedKeyForMe };
}

/**
 * `send_message` is a thin wrapper around `messageService.createMessage` —
 * the exact same service function `POST /v1/messages` calls. Validation
 * (Zod), membership checks, clientMessageId idempotency, and reply-target
 * checks all happen there, once, so the socket and REST transports can
 * never drift into different business rules for "can this message be
 * sent." This handler only adds what's specific to the real-time
 * transport: broadcasting the result and tracking delivery.
 *
 * Takes `io` (the whole server), not just `socket`, because `new_message`
 * and `message_delivered` both need to reach specific OTHER connections —
 * see the per-recipient emit loop below.
 */
export function registerSendMessageHandler(io: AppServer, socket: AppSocket): void {
  socket.on("send_message", async (payload, ack) => {
    try {
      const dto = createMessageSchema.parse(payload);
      const message = await messageService.createMessage(socket.data.userId, dto);

      ack?.({
        ok: true,
        message: toSocketPayload(message, message.encryptedKeyForMe),
      });

      const recipientIds = await registerRecipients(
        message.conversationId,
        message.id,
        socket.data.userId,
      );

      void notifyRecipientsOfNewMessage(recipientIds, socket.data.userId, message.id);

      await Promise.all(
        recipientIds.map(async (recipientId) => {
          const encryptedKeyForMe =
            dto.encryptedKeys.find((key) => key.recipientId === recipientId)?.encryptedKey ?? null;
          io.to(userRoom(recipientId)).emit(
            "new_message",
            toSocketPayload(message, encryptedKeyForMe),
          );
        }),
      );

      // Online check happens AFTER the emit above, not before — it only
      // decides whether to immediately fire the delivered-receipt; it
      // must never delay actual message delivery to the recipient.
      const onlineRecipientIds = await checkOnlineRecipients(recipientIds);

      await Promise.all(
        onlineRecipientIds.map(async (recipientId) => {
          const { deliveredAt } = await acknowledgeDelivery(message.id, recipientId);
          // io.to(), not socket.to(): this must reach the sender's own
          // current connection, not just their other tabs/devices.
          io.to(userRoom(socket.data.userId)).emit("message_delivered", {
            messageId: message.id,
            conversationId: message.conversationId,
            recipientId,
            deliveredAt,
          });
        }),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        ack?.({ ok: false, error: "Invalid message payload" });
        return;
      }

      const message = error instanceof Error ? error.message : "Internal error";
      log.error({ error, userId: socket.data.userId }, "send_message failed");
      ack?.({ ok: false, error: message });
    }
  });
}
