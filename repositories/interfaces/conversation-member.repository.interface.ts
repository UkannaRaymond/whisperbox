import type { ConversationMember, MemberRole } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

export interface CreateConversationMemberInput {
  conversationId: string;
  userId: string;
  role?: MemberRole;
}

export interface UpdateConversationMemberInput {
  role?: MemberRole;
  muted?: boolean;
  archived?: boolean;
  pinned?: boolean;
  lastReadMessageId?: string;
  leftAt?: Date;
}

/**
 * `ConversationMember` has no `deletedAt` column in the current schema —
 * `IBaseRepository.softDelete`/`hardDelete` are implemented against `leftAt`
 * instead (see repositories/prisma/conversation-member.repository.ts):
 * "soft-deleting" a membership row means the member left the conversation,
 * which is the closest real domain equivalent this table has.
 */
export interface IConversationMemberRepository extends IBaseRepository<
  ConversationMember,
  CreateConversationMemberInput,
  UpdateConversationMemberInput
> {
  findByConversationAndUser(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMember | null>;
  findAllForConversation(conversationId: string): Promise<ConversationMember[]>;
  markRead(conversationId: string, userId: string, messageId: string): Promise<ConversationMember>;
}
