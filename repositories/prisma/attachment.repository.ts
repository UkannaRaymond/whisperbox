import type { PrismaClient, Attachment } from "@prisma/client";
import type {
  IAttachmentRepository,
  CreateAttachmentInput,
  UpdateAttachmentInput,
} from "../interfaces/attachment.repository.interface";
import { NotFoundError } from "../../errors";

export class AttachmentRepository implements IAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Attachment | null> {
    return this.prisma.attachment.findFirst({ where: { id, deleted: false } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: { deleted: false },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { uploadedAt: "asc" },
    });
  }

  async create(data: CreateAttachmentInput): Promise<Attachment> {
    return this.prisma.attachment.create({ data });
  }

  async update(id: string, data: UpdateAttachmentInput): Promise<Attachment> {
    await this.assertExists(id);
    return this.prisma.attachment.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Attachment> {
    await this.assertExists(id);
    return this.prisma.attachment.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.attachment.delete({ where: { id } });
  }

  async findByMessageId(messageId: string): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({ where: { messageId, deleted: false } });
  }

  async incrementDownloadCount(id: string): Promise<Attachment> {
    await this.assertExists(id);
    return this.prisma.attachment.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.attachment.findFirst({
      where: { id, deleted: false },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Attachment", id);
  }
}
