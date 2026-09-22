import { z } from "zod";

/**
 * Contacts (features/contacts — previously an empty `.gitkeep` stub; the
 * repository layer, repositories/prisma/contact.repository.ts, already
 * existed and was fully implemented, but nothing above it — schema,
 * service, API route, or UI — did).
 *
 * Not `.uuid()` for user ids: Better Auth's default id generator does not
 * produce RFC 4122 UUIDs (same reasoning as createConversationSchema's
 * `memberIds` in schemas/conversation.schema.ts).
 */
export const addContactSchema = z.object({
  /** Username or email of the person to add — resolved server-side via userService.lookupUser, same as starting a new conversation. */
  handle: z.string().min(1, "Enter a username or email"),
  nickname: z.string().max(100).optional(),
});
export type AddContactDto = z.infer<typeof addContactSchema>;

export const updateContactSchema = z
  .object({
    nickname: z.string().max(100).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    favorite: z.boolean().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateContactDto = z.infer<typeof updateContactSchema>;

export const listContactsQuerySchema = z.object({
  blocked: z.coerce.boolean().optional(),
});
export type ListContactsQueryDto = z.infer<typeof listContactsQuerySchema>;

export const contactParamsSchema = z.object({
  /** The OTHER user's id, not the Contact row's own id — see contact.service.ts's doc comment on why. */
  id: z.string().min(1, "Invalid contact id"),
});
export type ContactParamsDto = z.infer<typeof contactParamsSchema>;

export const contactUserSummarySchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  status: z.enum(["ONLINE", "AWAY", "BUSY", "INVISIBLE", "OFFLINE"]),
  lastSeenAt: z.string().datetime().nullable(),
});
export type ContactUserSummaryDto = z.infer<typeof contactUserSummarySchema>;

export const contactResponseSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  contactId: z.string(),
  nickname: z.string().nullable(),
  notes: z.string().nullable(),
  favorite: z.boolean(),
  pinned: z.boolean(),
  blocked: z.boolean(),
  /** The other user's public profile — resolved server-side so the UI never has to make a second round trip per contact row. */
  user: contactUserSummarySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ContactResponseDto = z.infer<typeof contactResponseSchema>;
