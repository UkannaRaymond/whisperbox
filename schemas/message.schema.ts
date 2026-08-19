import { z } from "zod";

// Matches the actual `MessageType` enum — there is no VOICE_NOTE; LOCATION
// and CONTACT exist instead.
export const messageTypeSchema = z.enum([
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "FILE",
  "LOCATION",
  "CONTACT",
  "SYSTEM",
]);

export const messageStatusSchema = z.enum(["SENDING", "SENT", "DELIVERED", "READ", "FAILED"]);

export const listMessagesQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().uuid().optional(),
});
export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;

/**
 * A single recipient's wrapped copy of the message's AES key.
 *
 * NOTE: `recipientId` identifies a USER, not a device — the schema's
 * `@@unique([messageId, recipientId])` constraint only allows one wrapped
 * copy per recipient user, regardless of how many devices they have
 * logged in. See the multi-device caveat in
 * repositories/interfaces/message.repository.interface.ts.
 */
export const encryptedKeySchema = z.object({
  recipientId: z.string(),
  encryptedKey: z.string().min(1),
  algorithm: z.string().optional(),
});

export const createMessageSchema = z.object({
  conversationId: z.string().uuid(),
  // Client-generated idempotency key for safe offline-queue retries.
  clientMessageId: z.string().uuid(),
  type: messageTypeSchema.default("TEXT"),
  // The server only ever stores ciphertext — "Zero Knowledge" / "Server stores ciphertext only".
  // Plaintext is never accepted here.
  encryptedContent: z.string().min(1, "encryptedContent is required"),
  // AES-GCM nonce/IV paired with encryptedContent. Must be unique per
  // encryption under the same key — never reuse one.
  nonce: z.string().min(1, "nonce is required"),
  encryptionVersion: z.number().int().positive().default(1),
  replyToMessageId: z.string().uuid().optional(),
  encryptedKeys: z.array(encryptedKeySchema).min(1, "At least one recipient key is required"),
});
export type CreateMessageDto = z.infer<typeof createMessageSchema>;

// Editing content requires BOTH a new ciphertext and a new nonce together —
// reusing the old nonce with new content would break AES-GCM's security
// guarantees. `pinned` can be toggled independently.
export const updateMessageSchema = z
  .object({
    encryptedContent: z.string().min(1).optional(),
    nonce: z.string().min(1).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine((data) => (data.encryptedContent === undefined) === (data.nonce === undefined), {
    message: "encryptedContent and nonce must be provided together",
    path: ["nonce"],
  });
export type UpdateMessageDto = z.infer<typeof updateMessageSchema>;

export const messageParamsSchema = z.object({
  id: z.string().uuid("Invalid message id"),
});
export type MessageParamsDto = z.infer<typeof messageParamsSchema>;

export const messageResponseSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string(),
  clientMessageId: z.string(),
  type: messageTypeSchema,
  // "delete for everyone" already blanks encryptedContent/nonce at the
  // repository layer; never re-expose historical content here either way.
  encryptedContent: z.string(),
  nonce: z.string(),
  encryptionVersion: z.number(),
  status: messageStatusSchema,
  // BigInt doesn't serialize to JSON natively — represented as a string.
  sequenceNumber: z.string(),
  replyToMessageId: z.string().uuid().nullable(),
  pinned: z.boolean(),
  edited: z.boolean(),
  editedAt: z.string().datetime().nullable(),
  deleted: z.boolean(),
  // This user's own wrapped copy of the message's AES content key
  // (EncryptedMessageKey.encryptedKey where recipientId = the requesting
  // user), or null if none exists yet — e.g. sent before this account
  // registered a device (features/chat/utils/resolve-recipient-keys.ts).
  // Never another recipient's wrapped key; the server only ever resolves
  // the caller's own (services/mappers.ts#toMessageResponse).
  encryptedKeyForMe: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MessageResponseDto = z.infer<typeof messageResponseSchema>;
