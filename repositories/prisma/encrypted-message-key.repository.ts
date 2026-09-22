import type {
  IEncryptedMessageKeyRepository,
  CreateEncryptedMessageKeyInput,
  UpdateEncryptedMessageKeyInput,
} from "../interfaces/encrypted-message-key.repository.interface";
import { NotFoundError } from "../../errors";
import { EncryptedMessageKey, PrismaClient } from "@/lib/generated/prisma/client";

export class EncryptedMessageKeyRepository implements IEncryptedMessageKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<EncryptedMessageKey | null> {
    return this.prisma.encryptedMessageKey.findUnique({ where: { id } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<EncryptedMessageKey[]> {
    return this.prisma.encryptedMessageKey.findMany({
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: CreateEncryptedMessageKeyInput): Promise<EncryptedMessageKey> {
    return this.prisma.encryptedMessageKey.create({
      data: { ...data, algorithm: data.algorithm ?? "RSA-OAEP-4096" },
    });
  }

  async update(id: string, data: UpdateEncryptedMessageKeyInput): Promise<EncryptedMessageKey> {
    await this.assertExists(id);
    return this.prisma.encryptedMessageKey.update({ where: { id }, data });
  }

  /** This row has no soft-delete column — deleting is always permanent. */
  async softDelete(id: string): Promise<EncryptedMessageKey> {
    const record = await this.prisma.encryptedMessageKey.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("EncryptedMessageKey", id);
    await this.prisma.encryptedMessageKey.delete({ where: { id } });
    return record;
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.encryptedMessageKey.delete({ where: { id } });
  }

  async findByMessageId(messageId: string): Promise<EncryptedMessageKey[]> {
    return this.prisma.encryptedMessageKey.findMany({ where: { messageId } });
  }

  async findForRecipient(
    messageId: string,
    recipientId: string,
  ): Promise<EncryptedMessageKey | null> {
    return this.prisma.encryptedMessageKey.findUnique({
      where: { messageId_recipientId: { messageId, recipientId } },
    });
  }

  async createMany(keys: CreateEncryptedMessageKeyInput[]): Promise<number> {
    const result = await this.prisma.encryptedMessageKey.createMany({
      data: keys.map((key) => ({ ...key, algorithm: key.algorithm ?? "RSA-OAEP-4096" })),
      skipDuplicates: true,
    });
    return result.count;
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.encryptedMessageKey.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("EncryptedMessageKey", id);
  }
}
