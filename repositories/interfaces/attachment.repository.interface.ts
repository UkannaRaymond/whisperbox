import type { Attachment, AttachmentType } from "@prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

/**
 * Reconciled against the actual current schema. Notably:
 * - `size` is `BigInt`, not `Int` (files can exceed 2^31 bytes).
 * - `url` doesn't exist — object storage keys are `storageKey` (the R2
 *   object key; a signed download URL is generated on read, not stored).
 * - `type`, `uploadedById`, `encryptedKey`, `nonce`, `checksum` are all
 *   required columns with no default, so every field below that maps to
 *   one of them is required too.
 * - `encryptedKey`/`nonce` here are for the ATTACHMENT'S OWN AES-GCM
 *   encryption of the file bytes — assumed to be an envelope design where
 *   this per-file key is itself encrypted under the parent message's
 *   already-wrapped AES key (so attachments don't need their own
 *   per-recipient wrapping table). This is inferred from the schema shape,
 *   not stated anywhere explicitly — worth confirming against whatever the
 *   client is actually implementing.
 */
export interface CreateAttachmentInput {
  messageId: string;
  uploadedById: string;
  type: AttachmentType;
  fileName: string;
  originalFileName?: string;
  mimeType: string;
  extension?: string;
  size: bigint;
  storageKey: string;
  thumbnailKey?: string;
  previewKey?: string;
  encryptedKey: string;
  nonce: string;
  checksum: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UpdateAttachmentInput {
  storageKey?: string;
  fileName?: string;
  thumbnailKey?: string;
  previewKey?: string;
}

export interface IAttachmentRepository extends IBaseRepository<
  Attachment,
  CreateAttachmentInput,
  UpdateAttachmentInput
> {
  findByMessageId(messageId: string): Promise<Attachment[]>;
  incrementDownloadCount(id: string): Promise<Attachment>;
}
