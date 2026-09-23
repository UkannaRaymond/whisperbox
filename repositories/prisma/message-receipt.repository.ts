import type {
  IMessageReceiptRepository,
  CreateMessageReceiptInput,
  UpdateMessageReceiptInput,
} from "../interfaces/message-receipt.repository.interface";
import { NotFoundError } from "../../errors";
import type { MessageReceipt, PrismaClient } from "@/lib/generated/prisma/client";

export class MessageReceiptRepository implements IMessageReceiptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<MessageReceipt | null> {
    return this.prisma.messageReceipt.findUnique({ where: { id } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<MessageReceipt[]> {
    return this.prisma.messageReceipt.findMany({
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: CreateMessageReceiptInput): Promise<MessageReceipt> {
    return this.prisma.messageReceipt.create({ data });
  }

  async update(id: string, data: UpdateMessageReceiptInput): Promise<MessageReceipt> {
    await this.assertExists(id);
    return this.prisma.messageReceipt.update({ where: { id }, data });
  }

  /** No soft-delete column on this model — deleting is always permanent, and there's no real reason to delete a receipt anyway. */
  async softDelete(id: string): Promise<MessageReceipt> {
    const record = await this.prisma.messageReceipt.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("MessageReceipt", id);
    await this.prisma.messageReceipt.delete({ where: { id } });
    return record;
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.messageReceipt.delete({ where: { id } });
  }

  async createManyForMessage(messageId: string, recipientUserIds: string[]): Promise<number> {
    if (recipientUserIds.length === 0) return 0;
    const result = await this.prisma.messageReceipt.createMany({
      data: recipientUserIds.map((userId) => ({ messageId, userId })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findByMessageId(messageId: string): Promise<MessageReceipt[]> {
    return this.prisma.messageReceipt.findMany({ where: { messageId } });
  }

  async findByMessageAndUser(messageId: string, userId: string): Promise<MessageReceipt | null> {
    return this.prisma.messageReceipt.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });
  }

  async markDelivered(messageId: string, userId: string): Promise<MessageReceipt> {
    return this.prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, deliveredAt: new Date() },
      update: { deliveredAt: new Date() },
    });
  }

  async markReadUpTo(conversationId: string, userId: string, messageId: string): Promise<number> {
    const target = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { sequenceNumber: true },
    });
    if (!target) throw new NotFoundError("Message", messageId);

    const result = await this.prisma.messageReceipt.updateMany({
      where: {
        userId,
        readAt: null,
        message: { conversationId, sequenceNumber: { lte: target.sequenceNumber } },
      },
      data: { readAt: new Date(), deliveredAt: new Date() },
    });
    return result.count;
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.messageReceipt.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("MessageReceipt", id);
  }
}
