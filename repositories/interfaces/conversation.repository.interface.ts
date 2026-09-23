import type {
  Conversation,
  ConversationType,
  ConversationVisibility,
  MemberRole,
} from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

/**
 * `ConversationRole` doesn't exist in the current schema — the member-role
 * enum is `MemberRole` (OWNER/ADMIN/MODERATOR/MEMBER, no GUEST). `avatarUrl`
 * is `avatar` on the actual `Conversation` model. Soft delete is a
 * `deleted` boolean kept in sync with `deletedAt`, not `deletedAt` alone.
 */
export interface CreateConversationInput {
  type: ConversationType;
  name?: string;
  description?: string;
  avatar?: string;
  visibility?: ConversationVisibility;
  createdById: string;
  /** Initial members to seed alongside the creator (creator is always added as OWNER). */
  memberIds?: string[];
}

export interface UpdateConversationInput {
  name?: string;
  description?: string;
  avatar?: string;
  visibility?: ConversationVisibility;
  archived?: boolean;
}

export interface IConversationRepository extends IBaseRepository<
  Conversation,
  CreateConversationInput,
  UpdateConversationInput
> {
  /**
   * Viewer-aware: unlike `findMany`/`findById`, this resolves everything
   * the conversation list UI actually needs to render a real chat-app
   * sidebar rather than a bare name/type list — see
   * `ConversationWithViewerContext`.
   */
  findForUser(
    userId: string,
    params?: { take?: number; cursor?: string },
  ): Promise<ConversationWithViewerContext[]>;
  /** Finds an existing 1:1 DIRECT conversation between two users, if any. */
  findDirectConversationBetween(userAId: string, userBId: string): Promise<Conversation | null>;
  addMember(conversationId: string, userId: string, role?: MemberRole): Promise<void>;
  removeMember(conversationId: string, userId: string): Promise<void>;
  updateMemberRole(conversationId: string, userId: string, role: MemberRole): Promise<void>;
  /** Same viewer-aware enrichment as `findForUser`, for a single conversation (e.g. the chat window header). */
  findByIdForViewer(id: string, viewerId: string): Promise<ConversationWithViewerContext | null>;
  /** Toggles `ConversationMember.pinned` for this viewer only — pinning is per-member, not global to the conversation. */
  setPinned(conversationId: string, userId: string, pinned: boolean): Promise<void>;
}

/**
 * The other active member of a DIRECT conversation's identity — `null`
 * for GROUP conversations (which have their own `name`/`avatar`) and for
 * a DIRECT conversation whose other member has left. This is what
 * resolves a conversation list item from a generic "Direct message" /
 * "Offline" placeholder (what every DIRECT conversation rendered as,
 * before this existed — `Conversation.name` is genuinely null for most
 * DIRECT conversations by design; the UI is supposed to show the OTHER
 * PERSON's name instead, which nothing ever fetched) into an actual
 * contact name and avatar.
 */
export interface ConversationOtherMember {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/** A message-shaped preview of a conversation's last message — enough for a list item to decrypt and render one line, without a second round trip. */
export interface ConversationLastMessagePreview {
  id: string;
  senderId: string;
  type: string;
  encryptedContent: string;
  nonce: string;
  encryptedKeyForMe: string | null;
  createdAt: Date;
}

/**
 * A conversation enriched with everything specific to the VIEWING user —
 * none of which is a property of the conversation itself, all of which a
 * real chat sidebar needs: is it pinned (by ME), how many unread messages
 * (for ME), what does the last message preview decrypt to (with MY
 * wrapped key), and — for a DIRECT conversation — who's actually on the
 * other end.
 */
export type ConversationWithViewerContext = Conversation & {
  pinned: boolean;
  unreadCount: number;
  lastMessage: ConversationLastMessagePreview | null;
  otherMember: ConversationOtherMember | null;
};
