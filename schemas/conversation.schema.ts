import { z } from "zod";
import { messageTypeSchema } from "./message.schema";

export const listConversationsQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});
export type ListConversationsQueryDto = z.infer<typeof listConversationsQuerySchema>;

// `avatarUrl` renamed to `avatar` to match the actual Conversation model.
// `visibility` (PRIVATE/PUBLIC) added — real column, defaults to PRIVATE.
export const createConversationSchema = z
  .object({
    type: z.enum(["DIRECT", "GROUP"]),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
    // Not `.uuid()`: these are User ids, and Better Auth's default id
    // generator does not produce RFC 4122 UUIDs (see the same note on
    // `userResponseSchema` in schemas/user.schema.ts) — validating them as
    // UUIDs rejects every real user id and made it impossible to ever
    // create a conversation.
    memberIds: z.array(z.string()).min(1, "At least one other member is required"),
  })
  .refine((data) => data.type !== "DIRECT" || data.memberIds.length === 1, {
    message: "DIRECT conversations must have exactly one other member",
    path: ["memberIds"],
  })
  .refine((data) => data.type !== "GROUP" || !!data.name, {
    message: "GROUP conversations require a name",
    path: ["name"],
  });
export type CreateConversationDto = z.infer<typeof createConversationSchema>;

export const conversationParamsSchema = z.object({
  id: z.string().uuid("Invalid conversation id"),
});
export type ConversationParamsDto = z.infer<typeof conversationParamsSchema>;

// PATCH /v1/conversations/[id] — currently just pin/unpin. Deliberately
// its own small schema (not folded into a broader "update conversation"
// shape) since pinning is a per-VIEWER preference
// (ConversationMember.pinned), not a property of the conversation
// itself — a PATCH here never touches the `Conversation` row.
export const updateConversationViewerStateSchema = z.object({
  pinned: z.boolean(),
});
export type UpdateConversationViewerStateDto = z.infer<typeof updateConversationViewerStateSchema>;

export const conversationOtherMemberSchema = z.object({
  userId: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type ConversationOtherMemberDto = z.infer<typeof conversationOtherMemberSchema>;

export const conversationLastMessagePreviewSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string(),
  type: messageTypeSchema,
  encryptedContent: z.string(),
  nonce: z.string(),
  encryptedKeyForMe: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ConversationLastMessagePreviewDto = z.infer<
  typeof conversationLastMessagePreviewSchema
>;

export const conversationResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["DIRECT", "GROUP"]),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  name: z.string().nullable(),
  description: z.string().nullable(),
  avatar: z.string().nullable(),
  createdById: z.string(),
  archived: z.boolean(),
  // Per-VIEWER fields — never a property of the conversation row itself.
  // Absent before: every DIRECT conversation rendered as generic "Direct
  // message" / "Offline" (Conversation.name is null by design for
  // DIRECT conversations — the UI is supposed to show the other
  // person's identity instead, which nothing ever resolved), no
  // pinned/unread state, and no last-message preview anywhere in the
  // conversation list.
  pinned: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
  lastMessage: conversationLastMessagePreviewSchema.nullable(),
  /** Only set for DIRECT conversations — null for GROUP (which has its own name/avatar) and for a DIRECT conversation whose other member has left. */
  otherMember: conversationOtherMemberSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ConversationResponseDto = z.infer<typeof conversationResponseSchema>;

// Added alongside `GET /v1/conversations/{id}/members`: this endpoint
// didn't exist before, which is what made
// `features/chat/utils/resolve-recipient-keys.ts` a documented, permanent
// blocker — there was no way to find out who's in a conversation before
// encrypting a message to them. `role`/`userId` are the two fields that
// endpoint actually needs; not the full `ConversationMember` row.
export const conversationMemberResponseSchema = z.object({
  userId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MODERATOR", "MEMBER"]),
  joinedAt: z.string().datetime(),
});
export type ConversationMemberResponseDto = z.infer<typeof conversationMemberResponseSchema>;
