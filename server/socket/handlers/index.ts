import { registerJoinConversationHandler } from "./join-conversation.handler";
import { registerLeaveConversationHandler } from "./leave-conversation.handler";
import { registerSendMessageHandler } from "./send-message.handler";
import { registerTypingHandlers } from "./typing.handler";
import { registerMarkReadHandler } from "./mark-read.handler";
import { registerAttachmentHandler } from "./attachment.handler";
import type { AppServer, AppSocket } from "../socket-auth";

/** Wires up every Client → Server event handler for one connected socket. */
export function registerAllHandlers(io: AppServer, socket: AppSocket): void {
  registerJoinConversationHandler(socket);
  registerLeaveConversationHandler(socket);
  registerSendMessageHandler(io, socket);
  registerTypingHandlers(socket);
  registerMarkReadHandler(socket);
  registerAttachmentHandler(socket);
}
