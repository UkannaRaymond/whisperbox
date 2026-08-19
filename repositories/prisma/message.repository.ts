import type { PrismaClient, Message, Prisma } from "@prisma/client";
import type {
  IMessageRepository,
  CreateMessageInput,
  UpdateMessageInput,
  MessageWithViewerKey,
} from "../interfaces/message.repository.interface";
import { NotFoundError } from "../../errors";

export class MessageRepository implements IMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Message | null> {
    return this.prisma.message.findFirst({ where: { id, deleted: false } });
  }

  /**
   * See `MessageWithViewerKey`'s doc comment — this is the read half of
   * closing the "every bubble renders locked forever" gap. Flattens the
   * at-most-one `encryptedKeys` row (the `@@unique([messageId,
   * recipientId])` constraint guarantees at most one) into a single
   * `encryptedKeyForMe` field so callers don't have to know about the
   * relation at all.
   */
  async findByIdForViewer(id: string, viewerId: string): Promise<MessageWithViewerKey | null> {
    const message = await this.prisma.message.findFirst({
      where: { id, deleted: false },
      include: { encryptedKeys: { where: { recipientId: viewerId }, take: 1 } },
    });
    if (!message) return null;
    return this.withViewerKey(message);
  }

  private withViewerKey<T extends { encryptedKeys: { encryptedKey: string }[] }>(
    message: T,
  ): Omit<T, "encryptedKeys"> & { encryptedKeyForMe: string | null } {
    const { encryptedKeys, ...rest } = message;
    return { ...rest, encryptedKeyForMe: encryptedKeys[0]?.encryptedKey ?? null };
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { deleted: false },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Creates a message together with its per-recipient wrapped encryption
   * keys in a single transaction (DATABASE.md: "Use transactions for
   * message creation"), and assigns `sequenceNumber` as
   * `MAX(sequenceNumber) + 1` for the conversation within that same
   * transaction.
   *
   * Caveat: Prisma's default (read-committed) transaction isolation does
   * NOT serialize this read-then-write against concurrent inserts into the
   * same conversation — two messages sent to the same conversation at
   * nearly the same instant could compute the same next sequence number,
   * since there is no `@@unique([conversationId, sequenceNumber])`
   * constraint to catch it (only a plain index). Under real concurrent
   * load this needs either a Postgres sequence per conversation or an
   * explicit `SELECT ... FOR UPDATE` via raw SQL; this implementation is
   * correct for the common case but not race-proof.
   */
  async create(data: CreateMessageInput): Promise<Message> {
    const { encryptedKeys = [], ...messageData } = data;
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const { _max } = await tx.message.aggregate({
        where: { conversationId: messageData.conversationId },
        _max: { sequenceNumber: true },
      });
      const sequenceNumber = (_max.sequenceNumber ?? 0n) + 1n;

      const message = await tx.message.create({ data: { ...messageData, sequenceNumber } });

      if (encryptedKeys.length > 0) {
        await tx.encryptedMessageKey.createMany({
          data: encryptedKeys.map((key) => ({
            messageId: message.id,
            recipientId: key.recipientId,
            encryptedKey: key.encryptedKey,
            algorithm: key.algorithm ?? "RSA-OAEP-4096",
          })),
          skipDuplicates: true,
        });
      }

      return message;
    });
  }

  async update(id: string, data: UpdateMessageInput): Promise<Message> {
    await this.assertExists(id);
    return this.prisma.message.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Message> {
    await this.assertExists(id);
    return this.prisma.message.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    // Never permanently delete encrypted messages by default (DATABASE.md).
    // Exposed for completeness / admin tooling only.
    await this.prisma.message.delete({ where: { id } });
  }

  async findByConversation(
    conversationId: string,
    viewerId: string,
    params?: { take?: number; cursor?: string },
  ): Promise<MessageWithViewerKey[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, deleted: false },
      include: { encryptedKeys: { where: { recipientId: viewerId }, take: 1 } },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
    return messages.map((message: Message & { encryptedKeys: { encryptedKey: string }[] }) =>
      this.withViewerKey(message),
    );
  }

  async findPinned(conversationId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId, pinned: true, deleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByClientMessageId(clientMessageId: string): Promise<Message | null> {
    return this.prisma.message.findUnique({ where: { clientMessageId } });
  }

  async deleteForEveryone(id: string): Promise<Message> {
    await this.assertExists(id);
    return this.prisma.message.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date(), encryptedContent: "", nonce: "" },
    });
  }

  async editContent(id: string, encryptedContent: string, nonce: string): Promise<Message> {
    await this.assertExists(id);
    return this.prisma.message.update({
      where: { id },
      data: { encryptedContent, nonce, edited: true, editedAt: new Date() },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.message.findFirst({
      where: { id, deleted: false },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Message", id);
  }
}
