import { repositories } from "../repositories/prisma";
import { ForbiddenError, NotFoundError } from "../errors";
import { assertMembership } from "./conversation.service";
import { notify } from "./notification.service";
import { toMessageResponse } from "./mappers";
import type {
  CreateMessageDto,
  UpdateMessageDto,
  ListMessagesQueryDto,
  MessageResponseDto,
} from "../schemas/message.schema";

/**
 * Fires a MESSAGE notification for each given recipient. Best-effort:
 * notification creation failing must never fail the send itself (a
 * message that was persisted and should reach its recipients is far more
 * important than the bell-dropdown row about it), so errors are
 * swallowed here, not propagated.
 *
 * Takes `recipientIds` directly rather than a `conversationId` — the
 * caller (send-message.handler.ts) already computed this list via
 * `initializeReceiptsForMessage`, and re-deriving it here with a second
 * `findAllForConversation` call was a redundant query on every send.
 *
 * Real-time delivery to an ONLINE recipient already happens via the
 * `new_message` socket event — this notification is what lets an
 * OFFLINE recipient see "you have unread activity" once they come back,
 * same as any chat app's notification center.
 */
export async function notifyRecipientsOfNewMessage(
  recipientIds: string[],
  senderId: string,
  messageId: string,
): Promise<void> {
  try {
    const sender = await repositories.users.findById(senderId);
    const senderName = sender?.profile?.displayName ?? sender?.name ?? "Someone";

    await Promise.all(
      recipientIds.map((recipientId) =>
        notify({
          userId: recipientId,
          type: "MESSAGE",
          title: senderName,
          body: "Sent you a new encrypted message",
          data: { messageId, senderId },
        }),
      ),
    );
  } catch {
    // Never let a notification failure surface to the sender as a failed send.
  }
}

export async function listMessages(
  userId: string,
  conversationId: string,
  query: ListMessagesQueryDto,
): Promise<MessageResponseDto[]> {
  await assertMembership(conversationId, userId);
  const messages = await repositories.messages.findByConversation(conversationId, userId, query);
  return messages.map(toMessageResponse);
}

export async function createMessage(
  userId: string,
  dto: CreateMessageDto,
): Promise<MessageResponseDto> {
  await assertMembership(dto.conversationId, userId);

  // `clientMessageId` is unique — an offline-queue retry of a send that
  // already landed should return the existing message, not error.
  const existing = await repositories.messages.findByClientMessageId(dto.clientMessageId);
  if (existing) {
    const withKey = await repositories.messages.findByIdForViewer(existing.id, userId);
    return toMessageResponse(withKey ?? existing);
  }

  if (dto.replyToMessageId) {
    const replyTarget = await repositories.messages.findById(dto.replyToMessageId);
    if (!replyTarget || replyTarget.conversationId !== dto.conversationId) {
      throw new NotFoundError("Message", dto.replyToMessageId);
    }
  }

  const message = await repositories.messages.create({
    conversationId: dto.conversationId,
    senderId: userId,
    clientMessageId: dto.clientMessageId,
    type: dto.type,
    encryptedContent: dto.encryptedContent,
    nonce: dto.nonce,
    encryptionVersion: dto.encryptionVersion,
    replyToMessageId: dto.replyToMessageId,
    encryptedKeys: dto.encryptedKeys,
  });

  // The sender's own wrapped key (if any) was just written as part of
  // dto.encryptedKeys — no need to re-query for it via findByIdForViewer.
  const encryptedKeyForMe =
    dto.encryptedKeys.find((key) => key.recipientId === userId)?.encryptedKey ?? null;

  // Notification firing moved to send-message.handler.ts, which already
  // has the recipient list from initializeReceiptsForMessage — calling
  // it from here required a second, redundant conversation-member query.
  return toMessageResponse({ ...message, encryptedKeyForMe });
}

export async function updateMessage(
  userId: string,
  messageId: string,
  dto: UpdateMessageDto,
): Promise<MessageResponseDto> {
  const message = await repositories.messages.findById(messageId);
  if (!message) throw new NotFoundError("Message", messageId);

  await assertMembership(message.conversationId, userId);

  if (dto.encryptedContent !== undefined && message.senderId !== userId) {
    throw new ForbiddenError("Only the sender can edit this message");
  }

  const updated =
    dto.encryptedContent !== undefined && dto.nonce !== undefined
      ? await repositories.messages.editContent(messageId, dto.encryptedContent, dto.nonce)
      : message;

  const final =
    dto.pinned !== undefined
      ? await repositories.messages.update(updated.id, { pinned: dto.pinned })
      : updated;

  const withKey = await repositories.messages.findByIdForViewer(final.id, userId);
  return toMessageResponse(withKey ?? final);
}

export async function deleteMessage(userId: string, messageId: string): Promise<void> {
  const message = await repositories.messages.findById(messageId);
  if (!message) throw new NotFoundError("Message", messageId);

  const membership = await repositories.conversationMembers.findByConversationAndUser(
    message.conversationId,
    userId,
  );
  if (!membership || membership.leftAt) {
    throw new ForbiddenError("You are not a member of this conversation");
  }

  const canDeleteForEveryone =
    message.senderId === userId || membership.role === "OWNER" || membership.role === "ADMIN";
  if (!canDeleteForEveryone) {
    throw new ForbiddenError(
      "Only the sender or a conversation admin/moderator can delete this message",
    );
  }

  await repositories.messages.deleteForEveryone(messageId);
}
