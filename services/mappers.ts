import type { UserResponseDto } from "../schemas/user.schema";
import type { ConversationResponseDto } from "../schemas/conversation.schema";
import type { MessageResponseDto } from "../schemas/message.schema";
import type { AttachmentResponseDto } from "../schemas/attachment.schema";
import type {
  ConversationOtherMember,
  ConversationLastMessagePreview,
} from "../repositories/interfaces/conversation.repository.interface";
import {
  Attachment,
  Conversation,
  Message,
  User,
  UserProfile,
} from "@/lib/generated/prisma/client";

export function toUserResponse(user: User & { profile: UserProfile | null }): UserResponseDto {
  const profile = user.profile;
  return {
    id: user.id,
    email: user.email,
    username: profile?.username ?? null,
    displayName: profile?.displayName ?? user.name,
    avatarUrl: profile?.avatarUrl ?? user.image,
    bio: profile?.bio ?? null,
    status: profile?.status ?? "OFFLINE",
    lastSeenAt: profile?.lastSeenAt ? profile.lastSeenAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * `conversation` may optionally carry the viewer-context fields resolved
 * by `ConversationRepository#enrichForViewer` (`pinned`/`unreadCount`/
 * `lastMessage`/`otherMember` — see `ConversationWithViewerContext` in
 * repositories/interfaces/conversation.repository.interface.ts). Callers
 * without viewer context (none currently — every conversation the API
 * returns is scoped to a specific requesting user) get sensible
 * unopinionated defaults instead of `undefined`, since the response
 * schema requires these fields to be present.
 */
export function toConversationResponse(
  conversation: Conversation & {
    pinned?: boolean;
    unreadCount?: number;
    lastMessage?: ConversationLastMessagePreview | null;
    otherMember?: ConversationOtherMember | null;
  },
): ConversationResponseDto {
  return {
    id: conversation.id,
    type: conversation.type,
    visibility: conversation.visibility,
    name: conversation.name,
    description: conversation.description,
    avatar: conversation.avatar,
    createdById: conversation.createdById,
    archived: conversation.archived,
    pinned: conversation.pinned ?? false,
    unreadCount: conversation.unreadCount ?? 0,
    lastMessage: conversation.lastMessage
      ? {
          id: conversation.lastMessage.id,
          senderId: conversation.lastMessage.senderId,
          type: conversation.lastMessage.type as MessageResponseDto["type"],
          encryptedContent: conversation.lastMessage.encryptedContent,
          nonce: conversation.lastMessage.nonce,
          encryptedKeyForMe: conversation.lastMessage.encryptedKeyForMe,
          createdAt: conversation.lastMessage.createdAt.toISOString(),
        }
      : null,
    otherMember: conversation.otherMember ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

/**
 * `message` may optionally carry `encryptedKeyForMe` (see
 * `MessageWithViewerKey` in
 * repositories/interfaces/message.repository.interface.ts) — the
 * caller's own wrapped content key for this message, when the caller
 * fetched it viewer-aware (`findByIdForViewer`/`findByConversation`).
 * Callers that only have a plain `Message` (no viewer context — e.g.
 * internal existence checks) simply don't get that field populated,
 * which is correct: there's no "me" to resolve a key for there.
 */
export function toMessageResponse(
  message: Message & { encryptedKeyForMe?: string | null },
): MessageResponseDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    clientMessageId: message.clientMessageId,
    type: message.type,
    // "delete for everyone" already blanks these at the repository layer;
    // never re-expose historical content here either way.
    encryptedContent: message.deleted ? "" : message.encryptedContent,
    nonce: message.deleted ? "" : message.nonce,
    encryptionVersion: message.encryptionVersion,
    status: message.status,
    sequenceNumber: message.sequenceNumber.toString(),
    replyToMessageId: message.replyToMessageId,
    pinned: message.pinned,
    edited: message.edited,
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    deleted: message.deleted,
    // Never re-expose a wrapped key for a "deleted for everyone" message
    // — its ciphertext is already blanked above, so a key would decrypt
    // nothing anyway, but there's no reason to leak it either.
    encryptedKeyForMe: message.deleted ? null : (message.encryptedKeyForMe ?? null),
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
}

export function toAttachmentResponse(attachment: Attachment): AttachmentResponseDto {
  return {
    id: attachment.id,
    messageId: attachment.messageId,
    uploadedById: attachment.uploadedById,
    type: attachment.type,
    fileName: attachment.fileName,
    originalFileName: attachment.originalFileName,
    mimeType: attachment.mimeType,
    extension: attachment.extension,
    size: attachment.size.toString(),
    storageKey: attachment.storageKey,
    thumbnailKey: attachment.thumbnailKey,
    previewKey: attachment.previewKey,
    encryptedKey: attachment.encryptedKey,
    nonce: attachment.nonce,
    checksum: attachment.checksum,
    width: attachment.width,
    height: attachment.height,
    duration: attachment.duration,
    downloadCount: attachment.downloadCount,
    uploadedAt: attachment.uploadedAt.toISOString(),
  };
}
