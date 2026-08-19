import { createLogger } from "../../logger";
import { leaveConversationRoom } from "../rooms";
import type { AppSocket } from "../socket-auth";

const log = createLogger("socket:handler:leave-conversation");

export function registerLeaveConversationHandler(socket: AppSocket): void {
  socket.on("leave_conversation", async ({ conversationId }, ack) => {
    try {
      await leaveConversationRoom(socket, conversationId);
      ack?.(true);
    } catch (error) {
      log.error({ error, conversationId, userId: socket.data.userId }, "leave_conversation failed");
      ack?.(false);
    }
  });
}
