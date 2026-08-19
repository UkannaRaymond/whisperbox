/**
 * Domain representation of a message, for frontend consumption.
 * Re-exports the real DTO (schemas/message.schema.ts) — see the note in
 * user.ts. The previous version modeled a single `ciphertext` field and a
 * `deletedAt`-only soft delete; the real shape is
 * `encryptedContent` + `nonce` (AES-GCM requires both) and a `deleted`
 * boolean kept in sync with `deletedAt`.
 */
export type { MessageResponseDto as Message } from "@/schemas/message.schema";
