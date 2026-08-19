import { createLogger } from "../../logger";
import { acknowledgeRead } from "../delivery.service";
import { conversationRoom } from "../rooms";
import type { AppSocket } from "../socket-auth";

const log = createLogger("socket:handler:mark-read");

export function registerMarkReadHandler(socket: AppSocket): void {
  socket.on("mark_read", async ({ conversationId, messageId }, ack) => {
    try {
      const { readAt } = await acknowledgeRead(conversationId, socket.data.userId, messageId);

      // Broadcast to the room (including read-receipt-relevant senders,
      // but not the reader themself — they already know they just read it).
      socket.to(conversationRoom(conversationId)).emit("message_read", {
        conversationId,
        readerId: socket.data.userId,
        upToMessageId: messageId,
        readAt,
      });

      ack?.(true);
    } catch (error) {
      log.error(
        { error, conversationId, messageId, userId: socket.data.userId },
        "mark_read failed",
      );
      ack?.(false);
    }
  });
}
