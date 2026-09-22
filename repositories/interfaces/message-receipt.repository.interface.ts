import { MessageReceipt } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

export interface CreateMessageReceiptInput {
  messageId: string;
  userId: string;
}

export interface UpdateMessageReceiptInput {
  deliveredAt?: Date;
  readAt?: Date;
}

/**
 * Per-recipient delivery/read tracking (08-WEBSOCKET.md: "Message delivery
 * acknowledgements", "Read receipts"). One row per (message, recipient) —
 * `@@unique([messageId, userId])` — distinct from `Message.status`, which
 * is a single conversation-wide field; a receipt is what lets "delivered"
 * and "read" be tracked per person in a group conversation instead of as
 * one global status.
 */
export interface IMessageReceiptRepository extends IBaseRepository<
  MessageReceipt,
  CreateMessageReceiptInput,
  UpdateMessageReceiptInput
> {
  /** Creates a pending (undelivered, unread) receipt row for every given recipient — called once per message, for every member except the sender. */
  createManyForMessage(messageId: string, recipientUserIds: string[]): Promise<number>;
  findByMessageId(messageId: string): Promise<MessageReceipt[]>;
  findByMessageAndUser(messageId: string, userId: string): Promise<MessageReceipt | null>;
  markDelivered(messageId: string, userId: string): Promise<MessageReceipt>;
  /** Marks every unread message up to and including `messageId`'s sequence number, for this user in this conversation, as read in one batch. */
  markReadUpTo(conversationId: string, userId: string, messageId: string): Promise<number>;
}
