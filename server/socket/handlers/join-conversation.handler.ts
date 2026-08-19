import { createLogger } from "../../logger";
import { repositories } from "../../../repositories/prisma";
import { joinConversationRoom } from "../rooms";
import { getOnlineUserIds } from "../presence.service";
import type { AppSocket } from "../socket-auth";

const log = createLogger("socket:handler:join-conversation");

/**
 * Snapshot of who's online among this conversation's members right now.
 * Needed alongside the `user_online`/`user_offline` broadcasts
 * (presence.service.ts): those only fire on a *future* transition, so a
 * client joining a conversation where someone is already online would
 * otherwise show them as offline until that person's connection count
 * happens to change again (10-FRONTEND.md § UI Components: "Online
 * Presence" was showing everyone offline for exactly this reason — there
 * was no initial-state fetch anywhere in the presence flow, client or
 * server).
 */
async function getOnlineMemberIds(
  conversationId: string,
  excludeUserId: string,
): Promise<string[]> {
  const members = await repositories.conversationMembers.findAllForConversation(conversationId);
  const otherMemberIds = members
    .filter((member) => !member.leftAt && member.userId !== excludeUserId)
    .map((member) => member.userId);

  return getOnlineUserIds(otherMemberIds);
}

export function registerJoinConversationHandler(socket: AppSocket): void {
  socket.on(
    "join_conversation",
    async (
      payload: { conversationId: string },
      ack?: (ok: boolean, error?: string, onlineUserIds?: string[]) => void,
    ) => {
      const { conversationId } = payload;

      try {
        const joined = await joinConversationRoom(socket, conversationId);
        if (!joined) {
          ack?.(false, "Not a member of this conversation");
          return;
        }

        const onlineUserIds = await getOnlineMemberIds(conversationId, socket.data.userId);
        ack?.(true, undefined, onlineUserIds);
      } catch (error) {
        log.error(
          { error, conversationId, userId: socket.data.userId },
          "join_conversation failed",
        );
        ack?.(false, "Internal error");
      }
    },
  );
}
