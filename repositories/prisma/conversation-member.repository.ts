import type {
  IConversationMemberRepository,
  CreateConversationMemberInput,
  UpdateConversationMemberInput,
} from "../interfaces/conversation-member.repository.interface";
import { NotFoundError } from "../../errors";
import { ConversationMember, PrismaClient } from "@/lib/generated/prisma/client";

export class ConversationMemberRepository implements IConversationMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ConversationMember | null> {
    return this.prisma.conversationMember.findUnique({ where: { id } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<ConversationMember[]> {
    return this.prisma.conversationMember.findMany({
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { joinedAt: "asc" },
    });
  }

  async create(data: CreateConversationMemberInput): Promise<ConversationMember> {
    return this.prisma.conversationMember.create({ data });
  }

  async update(id: string, data: UpdateConversationMemberInput): Promise<ConversationMember> {
    await this.assertExists(id);
    return this.prisma.conversationMember.update({ where: { id }, data });
  }

  /** No `deletedAt` column exists on this model — "soft delete" is modeled as leaving the conversation. */
  async softDelete(id: string): Promise<ConversationMember> {
    await this.assertExists(id);
    return this.prisma.conversationMember.update({ where: { id }, data: { leftAt: new Date() } });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.conversationMember.delete({ where: { id } });
  }

  async findByConversationAndUser(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMember | null> {
    return this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
    });
  }

  async findAllForConversation(conversationId: string): Promise<ConversationMember[]> {
    return this.prisma.conversationMember.findMany({
      where: { conversationId, leftAt: null },
      orderBy: { joinedAt: "asc" },
    });
  }

  async findAllForUser(userId: string): Promise<ConversationMember[]> {
    return this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      orderBy: { joinedAt: "asc" },
    });
  }

  async markRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<ConversationMember> {
    const member = await this.findByConversationAndUser(conversationId, userId);
    if (!member) throw new NotFoundError("ConversationMember");
    return this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadMessageId: messageId },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.conversationMember.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("ConversationMember", id);
  }
}
