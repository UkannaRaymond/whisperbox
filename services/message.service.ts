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
 * Fires a MESSAGE notification for every other active member of the
 * conversation. Best-effort: notification creation failing must never
 * fail the send itself (a message that was persisted and should reach
 * its recipients is far more important than the bell-dropdown row about
 * it), so errors are swallowed here, not propagated.
 *
 * Real-time delivery to an ONLINE recipient already happens via the
 * `new_message` socket event (server/socket/handlers/send-message.handler.ts)
 * — this notification is what lets an OFFLINE recipient see "you have
 * unread activity" once they come back, same as any chat app's
 * notification center.
 */
async function notifyRecipientsOfNewMessage(
  conversationId: string,
  senderId: string,
  messageId: string,
): Promise<void> {
  try {
    const members = await repositories.conversationMembers.findAllForConversation(conversationId);
    const sender = await repositories.users.findById(senderId);
    const senderName = sender?.profile?.displayName ?? sender?.name ?? "Someone";

    await Promise.all(
      members
        .filter((member) => member.userId !== senderId)
        .map((member) =>
          notify({
            userId: member.userId,
            type: "MESSAGE",
            title: senderName,
            body: "Sent you a new encrypted message",
            data: { conversationId, messageId, senderId },
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

  // Re-fetch viewer-aware rather than reusing the plain `create()` result:
  // the sender needs their OWN wrapped copy of the key back (so they can
  // decrypt and render the message they just sent), and `create()`
  // doesn't include the `encryptedKeys` relation it just inserted.
  const withKey = await repositories.messages.findByIdForViewer(message.id, userId);
  void notifyRecipientsOfNewMessage(dto.conversationId, userId, message.id);
  return toMessageResponse(withKey ?? message);
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

  // Re-fetch viewer-aware for the same reason createMessage does: `update`/
  // `editContent` return a plain `Message` with no `encryptedKeys`
  // relation, and the caller's own client-side cache (features/offline/
  // types/offline.types.ts's `LocalMessage` IS `MessageResponseDto`)
  // would otherwise get overwritten with `encryptedKeyForMe: null` on
  // every edit/pin toggle — silently re-locking a message the user could
  // already read.
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
