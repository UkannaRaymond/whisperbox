import { Message, MessageType } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

export interface CreateEncryptedKeyInput {
  /**
   * The current schema wraps a message key per RECIPIENT USER
   * (`EncryptedMessageKey.recipientId -> User`, unique on
   * `[messageId, recipientId]`) — not per device. See the note on
   * `IMessageRepository` below; this is a real architectural limitation,
   * not a naming detail.
   */
  recipientId: string;
  encryptedKey: string;
  /** Defaults to "RSA-OAEP-4096" to match the actual key-wrapping scheme in use (07-CRYPTOGRAPHY.md) — the column's own schema default of "X25519" reflects a different, unused key-agreement design (see prisma/schema.prisma's IdentityKey/SignedPreKey/OneTimePreKey). */
  algorithm?: string;
}

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  /** Client-generated idempotency key (required, unique) — lets the offline queue safely retry a send without creating duplicates. */
  clientMessageId: string;
  type?: MessageType;
  /** AES-GCM ciphertext. The server never receives or stores plaintext. */
  encryptedContent: string;
  /** AES-GCM nonce/IV for `encryptedContent`. Must never be reused with the same key. */
  nonce: string;
  encryptionVersion?: number;
  replyToMessageId?: string;
  /** Per-recipient wrapped copies of this message's AES key, created transactionally with the message. */
  encryptedKeys?: CreateEncryptedKeyInput[];
}

export interface UpdateMessageInput {
  pinned?: boolean;
}

/**
 * IMPORTANT — multi-device limitation inherited from the schema, not
 * introduced here: `EncryptedMessageKey` has `@@unique([messageId,
 * recipientId])` where `recipientId` points at `User`, not at a specific
 * `Device`. That means a message can only carry ONE wrapped key per
 * recipient user, no matter how many devices they're logged into — the
 * unique constraint physically prevents a second wrapped copy for the same
 * user. PRD/SDD both call for multi-device support; as written, only
 * whichever one device's public key the sender happened to wrap against
 * will be able to decrypt. Fixing this properly means changing the unique
 * constraint to `[messageId, recipientDeviceId]` and pointing the relation
 * at `Device` instead of `User` — a schema change, which is out of scope
 * for a field-name reconciliation and is flagged here for a deliberate
 * decision rather than being silently patched around.
 */
export interface IMessageRepository extends IBaseRepository<
  Message,
  CreateMessageInput,
  UpdateMessageInput
> {
  findByConversation(
    conversationId: string,
    viewerId: string,
    params?: { take?: number; cursor?: string },
  ): Promise<MessageWithViewerKey[]>;
  findPinned(conversationId: string): Promise<Message[]>;
  /** Supports idempotent send-retries from the offline queue: `clientMessageId` is unique, so a retried send can check for its own earlier attempt instead of erroring on the constraint. */
  findByClientMessageId(clientMessageId: string): Promise<Message | null>;
  /** "Delete for everyone": blanks the ciphertext + nonce and marks the message deleted. Never a hard delete (DATABASE.md). */
  deleteForEveryone(id: string): Promise<Message>;
  /** Editing content requires a fresh nonce — reusing an AES-GCM nonce with the same key is a serious security bug, not just a style choice. */
  editContent(id: string, encryptedContent: string, nonce: string): Promise<Message>;
  /**
   * Same as `findById`, but also resolves `viewerId`'s own wrapped
   * content key for this message (if any) — see `MessageWithViewerKey`.
   * Used wherever a message is returned to a specific authenticated user
   * (as opposed to `findById`, used internally for existence/ownership
   * checks that don't need the key at all).
   */
  findByIdForViewer(id: string, viewerId: string): Promise<MessageWithViewerKey | null>;
}

/**
 * A message plus the CALLING user's own wrapped copy of its content key
 * (`EncryptedMessageKey.encryptedKey` where `recipientId = viewerId`), if
 * one exists. This is what actually closes the loop documented at length
 * in features/chat/components/chat-bubble.tsx: that component could only
 * ever render the locked state because nothing between the database and
 * the API response ever surfaced this per-viewer field — `Message` alone
 * (from `@prisma/client`) has no such property; it only exists once you
 * `include: { encryptedKeys: { where: { recipientId: viewerId } } }` and
 * flatten the (at most one, thanks to the `@@unique([messageId,
 * recipientId])` constraint noted above) result.
 */
export type MessageWithViewerKey = Message & { encryptedKeyForMe: string | null };
