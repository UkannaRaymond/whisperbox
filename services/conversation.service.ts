import { repositories } from "../repositories/prisma";
import { ForbiddenError, NotFoundError } from "../errors";
import { toConversationResponse } from "./mappers";
import type {
  CreateConversationDto,
  ListConversationsQueryDto,
  ConversationResponseDto,
  ConversationMemberResponseDto,
} from "../schemas/conversation.schema";

export async function listConversations(
  userId: string,
  query: ListConversationsQueryDto,
): Promise<ConversationResponseDto[]> {
  const conversations = await repositories.conversations.findForUser(userId, query);
  return conversations.map(toConversationResponse);
}

export async function createConversation(
  userId: string,
  dto: CreateConversationDto,
): Promise<ConversationResponseDto> {
  if (dto.type === "DIRECT") {
    const otherUserId = dto.memberIds[0]!;
    const existing = await repositories.conversations.findDirectConversationBetween(
      userId,
      otherUserId,
    );
    if (existing) {
      const enriched = await repositories.conversations.findByIdForViewer(existing.id, userId);
      if (!enriched) throw new NotFoundError("Conversation", existing.id);
      return toConversationResponse(enriched);
    }
  }

  const conversation = await repositories.conversations.create({
    type: dto.type,
    name: dto.name,
    description: dto.description,
    avatar: dto.avatar,
    visibility: dto.visibility,
    createdById: userId,
    memberIds: dto.memberIds,
  });

  return toConversationResponse(conversation);
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationResponseDto> {
  await assertMembership(conversationId, userId);

  const conversation = await repositories.conversations.findByIdForViewer(conversationId, userId);
  if (!conversation) throw new NotFoundError("Conversation", conversationId);

  return toConversationResponse(conversation);
}

/**
 * Pins/unpins a conversation for this user only — `ConversationMember.pinned`
 * is per-member, not a property of the conversation itself, so this never
 * affects how the conversation appears in anyone else's list.
 */
export async function setConversationPinned(
  userId: string,
  conversationId: string,
  pinned: boolean,
): Promise<void> {
  await assertMembership(conversationId, userId);
  await repositories.conversations.setPinned(conversationId, userId, pinned);
}

/**
 * List a conversation's active (not-left) members, for callers who need to
 * know who's actually in a conversation — currently just
 * `resolveRecipientKeys` (features/chat/utils/resolve-recipient-keys.ts),
 * which needs the member id list before it can look up their device
 * public keys and encrypt a message to them.
 */
export async function listMembers(
  userId: string,
  conversationId: string,
): Promise<ConversationMemberResponseDto[]> {
  await assertMembership(conversationId, userId);

  const members = await repositories.conversationMembers.findAllForConversation(conversationId);
  return members.map((member) => ({
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  }));
}

/** Throws ForbiddenError if the given user is not an active member of the conversation. */
export async function assertMembership(conversationId: string, userId: string): Promise<void> {
  const membership = await repositories.conversationMembers.findByConversationAndUser(
    conversationId,
    userId,
  );
  if (!membership || membership.leftAt) {
    throw new ForbiddenError("You are not a member of this conversation");
  }
}
