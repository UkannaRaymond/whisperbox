import { prisma } from "../../server/db/client";

import { UserRepository } from "./user.repository";
import { DeviceRepository } from "./device.repository";
import { ContactRepository } from "./contact.repository";
import { ConversationRepository } from "./conversation.repository";
import { ConversationMemberRepository } from "./conversation-member.repository";
import { MessageRepository } from "./message.repository";
import { MessageReceiptRepository } from "./message-receipt.repository";
import { EncryptedMessageKeyRepository } from "./encrypted-message-key.repository";
import { AttachmentRepository } from "./attachment.repository";
import { NotificationRepository } from "./notification.repository";

export {
  UserRepository,
  DeviceRepository,
  ContactRepository,
  ConversationRepository,
  ConversationMemberRepository,
  MessageRepository,
  MessageReceiptRepository,
  EncryptedMessageKeyRepository,
  AttachmentRepository,
  NotificationRepository,
};

/**
 * Pre-wired singleton repository instances, ready to be injected into the
 * service layer. Each repository receives the shared Prisma client.
 *
 * `sessions` / `refreshTokens` were removed: they wrapped a hand-rolled
 * `Session`/`RefreshToken` pair from before the move to Better Auth (see
 * services/session.service.ts) — those Prisma models no longer exist in
 * the schema, and `repositories/interfaces/index.ts` already stopped
 * exporting their interfaces. Better Auth's `Session` table is managed by
 * `auth.api.*` directly, not through this repository layer.
 */
export const repositories = {
  users: new UserRepository(prisma),
  devices: new DeviceRepository(prisma),
  contacts: new ContactRepository(prisma),
  conversations: new ConversationRepository(prisma),
  conversationMembers: new ConversationMemberRepository(prisma),
  messages: new MessageRepository(prisma),
  messageReceipts: new MessageReceiptRepository(prisma),
  encryptedMessageKeys: new EncryptedMessageKeyRepository(prisma),
  attachments: new AttachmentRepository(prisma),
  notifications: new NotificationRepository(prisma),
};
