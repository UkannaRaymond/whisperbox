import { repositories } from "../../repositories/prisma";
import { createLogger } from "../logger";
import type { AppSocket } from "./socket-auth";

const log = createLogger("socket:rooms");

/**
 * Room naming + join/leave helpers (Room Strategy:
 * `user:{userId}`, `conversation:{conversationId}`).
 */

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/** Every connection joins its own user room automatically — this is how server-initiated events (presence, reconnect_required) reach a specific user regardless of which conversation rooms they're in. */
export async function joinUserRoom(socket: AppSocket): Promise<void> {
  await socket.join(userRoom(socket.data.userId));
}

/**
 * Joins a conversation room, but only after verifying the connected user
 * is still an active member — reuses the same membership check the REST
 * API uses (repositories.conversationMembers), so authorization can't
 * drift between the two transports.
 */
export async function joinConversationRoom(
  socket: AppSocket,
  conversationId: string,
): Promise<boolean> {
  const membership = await repositories.conversationMembers.findByConversationAndUser(
    conversationId,
    socket.data.userId,
  );

  if (!membership || membership.leftAt) {
    log.warn(
      { userId: socket.data.userId, conversationId },
      "Rejected join_conversation: not an active member",
    );
    return false;
  }

  await socket.join(conversationRoom(conversationId));
  return true;
}

export async function leaveConversationRoom(
  socket: AppSocket,
  conversationId: string,
): Promise<void> {
  await socket.leave(conversationRoom(conversationId));
}

/**
 * Called on every (re)connection
 * re-joins the user's own room plus every conversation they're currently
 * an active member of, so a reconnecting client doesn't have to
 * re-request each conversation room individually and can't end up missing
 * broadcasts for a conversation it just forgot to rejoin.
 */
export async function rejoinAllRooms(socket: AppSocket): Promise<string[]> {
  await joinUserRoom(socket);

  const memberships = await repositories.conversationMembers.findAllForUser(socket.data.userId);
  const activeConversationIds = memberships.map((member) => member.conversationId);

  await Promise.all(activeConversationIds.map((id) => socket.join(conversationRoom(id))));

  return activeConversationIds;
}
