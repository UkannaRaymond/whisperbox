import { createLogger } from "../../logger";
import { startTyping, stopTyping } from "../typing.service";
import { conversationRoom } from "../rooms";
import type { AppSocket } from "../socket-auth";

const log = createLogger("socket:handler:typing");

/**
 * Uses `socket.to(room)`, not `io.to(room)` — broadcasts to everyone else
 * in the room while deliberately excluding the sender, so a client doesn't
 * receive its own typing state echoed back.
 */
export function registerTypingHandlers(socket: AppSocket): void {
  socket.on("typing_start", async ({ conversationId }) => {
    try {
      await startTyping(conversationId, socket.data.userId);
      socket.to(conversationRoom(conversationId)).emit("typing", {
        conversationId,
        userId: socket.data.userId,
        isTyping: true,
      });
    } catch (error) {
      log.error({ error, conversationId, userId: socket.data.userId }, "typing_start failed");
    }
  });

  socket.on("typing_stop", async ({ conversationId }) => {
    try {
      await stopTyping(conversationId, socket.data.userId);
      socket.to(conversationRoom(conversationId)).emit("typing", {
        conversationId,
        userId: socket.data.userId,
        isTyping: false,
      });
    } catch (error) {
      log.error({ error, conversationId, userId: socket.data.userId }, "typing_stop failed");
    }
  });
}
