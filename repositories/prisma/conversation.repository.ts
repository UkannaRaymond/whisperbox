import type { PrismaClient, Conversation, MemberRole, Prisma } from "@prisma/client";
import type {
  IConversationRepository,
  CreateConversationInput,
  UpdateConversationInput,
  ConversationWithViewerContext,
} from "../interfaces/conversation.repository.interface";
import { NotFoundError } from "../../errors";

/**
 * Reconciled against the actual current schema:
 * - Soft delete is `deleted: boolean` (kept in sync with `deletedAt`, which
 *   is only ever read as an audit timestamp here, never filtered on) —
 *   the model has both columns, and other code in this codebase may filter
 *   on either, so both are always set together.
 * - `ConversationMember` has no `deletedAt` column at all; "no longer a
 *   member" is `leftAt != null`, not a soft-delete flag. Every membership
 *   filter below reflects that.
 * - Member role type is `MemberRole`, not `ConversationRole`.
 */
export class ConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({ where: { id, deleted: false } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { deleted: false },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateConversationInput): Promise<Conversation> {
    const { memberIds = [], ...conversationData } = data;
    // Creator + any additional members are added transactionally so a
    // conversation never exists without at least its owner as a member.
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const conversation = await tx.conversation.create({ data: conversationData });

      const uniqueMemberIds = Array.from(new Set([data.createdById, ...memberIds]));
      await tx.conversationMember.createMany({
        data: uniqueMemberIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: userId === data.createdById ? "OWNER" : "MEMBER",
        })),
        skipDuplicates: true,
      });

      return conversation;
    });
  }

  async update(id: string, data: UpdateConversationInput): Promise<Conversation> {
    await this.assertExists(id);
    return this.prisma.conversation.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Conversation> {
    await this.assertExists(id);
    return this.prisma.conversation.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } });
  }

  async findForUser(
    userId: string,
    params?: { take?: number; cursor?: string },
  ): Promise<ConversationWithViewerContext[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        deleted: false,
        members: { some: { userId, leftAt: null } },
      },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { updatedAt: "desc" },
    });

    return this.enrichForViewer(conversations, userId);
  }

  async findByIdForViewer(
    id: string,
    viewerId: string,
  ): Promise<ConversationWithViewerContext | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, deleted: false },
    });
    if (!conversation) return null;
    const [enriched] = await this.enrichForViewer([conversation], viewerId);
    return enriched ?? null;
  }

  async setPinned(conversationId: string, userId: string, pinned: boolean): Promise<void> {
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId, leftAt: null },
      data: { pinned },
    });
  }

  /**
   * Resolves everything a conversation list/header needs that isn't a
   * property of the conversation itself — see
   * `ConversationWithViewerContext`'s doc comment. Four queries plus one
   * `count()` per conversation (see the unread-count comment below for
   * why that one isn't batched) — not fully N+1'd across
   * however many conversations are in `conversations`.
   */
  private async enrichForViewer(
    conversations: Conversation[],
    viewerId: string,
  ): Promise<ConversationWithViewerContext[]> {
    if (conversations.length === 0) return [];

    type LastMessageWithViewerKey = {
      id: string;
      senderId: string;
      type: string;
      encryptedContent: string;
      nonce: string;
      createdAt: Date;
      encryptedKeys: { encryptedKey: string }[];
    };

    const conversationIds = conversations.map((c) => c.id);
    const lastMessageIds = conversations
      .map((c) => c.lastMessageId)
      .filter((id): id is string => id !== null);
    const directConversationIds = conversations.filter((c) => c.type === "DIRECT").map((c) => c.id);

    const [viewerMemberships, otherMembers, lastMessages, unreadCounts] = (await Promise.all([
      this.prisma.conversationMember.findMany({
        where: { conversationId: { in: conversationIds }, userId: viewerId },
        select: { conversationId: true, pinned: true },
      }),
      directConversationIds.length > 0
        ? this.prisma.conversationMember.findMany({
            where: {
              conversationId: { in: directConversationIds },
              userId: { not: viewerId },
              leftAt: null,
            },
            include: { user: { include: { profile: true } } },
          })
        : Promise.resolve([]),
      lastMessageIds.length > 0
        ? this.prisma.message.findMany({
            where: { id: { in: lastMessageIds } },
            include: { encryptedKeys: { where: { recipientId: viewerId }, take: 1 } },
          })
        : Promise.resolve([]),
      // One count() per conversation, not a single grouped query — this
      // app's per-user conversation lists are small (tens, not
      // thousands), so the N+1 here is simpler and less error-prone than
      // threading a relation-joined groupBy through Prisma, which would
      // need a second lookup anyway (MessageReceipt has no
      // conversationId column of its own to group by directly).
      Promise.all(
        conversations.map((conversation) =>
          this.prisma.messageReceipt.count({
            where: {
              userId: viewerId,
              readAt: null,
              message: { conversationId: conversation.id, deleted: false },
            },
          }),
        ),
      ),
    ])) as [
      { conversationId: string; pinned: boolean }[],
      {
        conversationId: string;
        userId: string;
        user: {
          profile: {
            username: string | null;
            displayName: string | null;
            avatarUrl: string | null;
          } | null;
        };
      }[],
      LastMessageWithViewerKey[],
      number[],
    ];

    const pinnedByConversationId = new Map(
      viewerMemberships.map((m) => [m.conversationId, m.pinned]),
    );
    const otherMemberByConversationId = new Map(
      otherMembers.map((m) => [
        m.conversationId,
        {
          userId: m.userId,
          username: m.user.profile?.username ?? null,
          displayName: m.user.profile?.displayName ?? null,
          avatarUrl: m.user.profile?.avatarUrl ?? null,
        },
      ]),
    );
    const lastMessageById = new Map(lastMessages.map((m) => [m.id, m]));
    const unreadCountByConversationId = new Map(
      conversations.map((conversation, index) => [conversation.id, unreadCounts[index] ?? 0]),
    );

    return conversations.map((conversation) => {
      const lastMessage = conversation.lastMessageId
        ? (lastMessageById.get(conversation.lastMessageId) ?? null)
        : null;

      return {
        ...conversation,
        pinned: pinnedByConversationId.get(conversation.id) ?? false,
        unreadCount: unreadCountByConversationId.get(conversation.id) ?? 0,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              type: lastMessage.type,
              encryptedContent: lastMessage.encryptedContent,
              nonce: lastMessage.nonce,
              encryptedKeyForMe: lastMessage.encryptedKeys[0]?.encryptedKey ?? null,
              createdAt: lastMessage.createdAt,
            }
          : null,
        otherMember: otherMemberByConversationId.get(conversation.id) ?? null,
      };
    });
  }

  async findDirectConversationBetween(
    userAId: string,
    userBId: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        deleted: false,
        AND: [
          { members: { some: { userId: userAId, leftAt: null } } },
          { members: { some: { userId: userBId, leftAt: null } } },
        ],
      },
    });
  }

  async addMember(
    conversationId: string,
    userId: string,
    role: MemberRole = "MEMBER",
  ): Promise<void> {
    await this.assertExists(conversationId);
    await this.prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, role },
      update: { leftAt: null, role },
    });
  }

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  async updateMemberRole(conversationId: string, userId: string, role: MemberRole): Promise<void> {
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId, leftAt: null },
      data: { role },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.conversation.findFirst({
      where: { id, deleted: false },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Conversation", id);
  }
}
