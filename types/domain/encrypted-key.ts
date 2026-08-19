/**
 * A key-wrapping artifact: the message's AES key, encrypted to a specific
 * recipient's public key, per the PRD's key management requirements.
 * `ciphertext` is opaque to the server — it is never decryptable without
 * the recipient's private key.
 *
 * NOTE: this was previously keyed by `deviceId`, implying one wrapped copy
 * per device (matching the PRD's multi-device requirement). The actual
 * schema wraps per recipient USER instead
 * (`EncryptedMessageKey.recipientId -> User`, unique on
 * `[messageId, recipientId]`), which only allows ONE wrapped copy per
 * user regardless of how many devices they have. This type now matches
 * the schema as it exists; the underlying multi-device limitation is
 * flagged in repositories/interfaces/message.repository.interface.ts and
 * hasn't been fixed here, since resolving it means changing the schema's
 * unique constraint and relation target, not just this type.
 */
export interface EncryptedKey {
  id: string;
  recipientId: string;
  algorithm: "RSA-OAEP-4096" | "AES-256-GCM";
  ciphertext: string;
  createdAt: Date;
}
