/**
 * Domain representation of a conversation, for frontend consumption.
 * Re-exports the real DTOs (schemas/conversation.schema.ts) — see the
 * note in user.ts for why this file is a re-export rather than a
 * hand-maintained parallel type. The previous version used lowercase enum
 * values ("direct"/"group") the API has never actually returned (it's
 * "DIRECT"/"GROUP"), and had no `visibility`/`avatar`/`archived` fields.
 *
 * `ConversationMember` has no equivalent DTO yet (no
 * `GET /v1/conversations/{id}/members` endpoint exists) — kept as a
 * hand-written type below, matching the actual Prisma `MemberRole` enum
 * values, until that endpoint exists.
 */
export type { ConversationResponseDto as Conversation } from "@/schemas/conversation.schema";

import type { ConversationResponseDto } from "@/schemas/conversation.schema";

/** No standalone `ConversationType` export exists in schemas/conversation.schema.ts — derived from the DTO's own `type` field instead of duplicating the enum literal here. */
export type ConversationType = ConversationResponseDto["type"];

export type ConversationRole = "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: ConversationRole;
  joinedAt: string;
}
