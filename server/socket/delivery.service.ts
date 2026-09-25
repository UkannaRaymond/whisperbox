import { repositories } from "../../repositories/prisma";
import { createLogger } from "../logger";
import { isUserOnline } from "./presence.service";

const log = createLogger("socket:delivery");

/**
 * Delivery acknowledgements + read receipts (08-WEBSOCKET.md § Features).
 * Bridges the per-recipient `MessageReceipt` rows (repositories/prisma/
 * message-receipt.repository.ts) to the socket layer.
 */

/**
 * Called right after a message is persisted: creates a pending receipt row
 * for every active member of the conversation except the sender, and
 * returns the recipient list — the caller needs this to emit `new_message`
 * to every recipient's own user room (server/socket/handlers/
 * send-message.handler.ts).
 *
 * Deliberately does NOT check online status here — that used to be
 * bundled into this same function, but the Redis round trip it requires
 * (isUserOnline, below) was measured at 140-165ms against this project's
 * remote Upstash instance, and bundling it here meant every recipient's
 * actual message delivery was blocked on a check that has nothing to do
 * with whether the message should be emitted. See checkOnlineRecipients.
 */
export async function registerRecipients(
  conversationId: string,
  messageId: string,
  senderId: string,
): Promise<string[]> {
  const members = await repositories.conversationMembers.findAllForConversation(conversationId);
  const recipientIds = members
    .map((member) => member.userId)
    .filter((userId) => userId !== senderId);

  await repositories.messageReceipts.createManyForMessage(messageId, recipientIds);

  return recipientIds;
}

/**
 * Checks which of the given recipients are online right now and returns
 * that subset. Call this AFTER emitting `new_message` to every recipient,
 * not before — being in their user room to receive that emit IS delivery,
 * so the caller uses this subset to immediately mark+announce delivered
 * rather than leaving it pending, but the emit itself must never wait on
 * this check.
 */
export async function checkOnlineRecipients(recipientIds: string[]): Promise<string[]> {
  const onlineChecks = await Promise.all(
    recipientIds.map(async (userId) => ({ userId, online: await isUserOnline(userId) })),
  );
  return onlineChecks.filter((check) => check.online).map((check) => check.userId);
}

export async function acknowledgeDelivery(
  messageId: string,
  userId: string,
): Promise<{ deliveredAt: string }> {
  const receipt = await repositories.messageReceipts.markDelivered(messageId, userId);
  return { deliveredAt: (receipt.deliveredAt ?? new Date()).toISOString() };
}

/**
 * Marks every unread message up to `messageId` (by sequence order) as read
 * for this user in this conversation, and keeps `ConversationMember.
 * lastReadMessageId` in sync — the same field the REST API's
 * `PATCH`-equivalent read-tracking relies on, so a client mixing REST and
 * socket usage doesn't see inconsistent unread state between the two.
 */
export async function acknowledgeRead(
  conversationId: string,
  userId: string,
  messageId: string,
): Promise<{ readAt: string; updatedCount: number }> {
  const [updatedCount] = await Promise.all([
    repositories.messageReceipts.markReadUpTo(conversationId, userId, messageId),
    repositories.conversationMembers.markRead(conversationId, userId, messageId).catch((error) => {
      log.warn({ conversationId, userId, messageId, error }, "Failed to sync lastReadMessageId");
    }),
  ]);

  return { readAt: new Date().toISOString(), updatedCount };
}
