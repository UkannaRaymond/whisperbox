import { z } from "zod";

export const attachmentTypeSchema = z.enum([
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "ARCHIVE",
  "OTHER",
]);

/**
 * File bytes are encrypted client-side and uploaded directly to Cloudflare
 * R2 by the client; this endpoint only registers the resulting object's
 * metadata against a message. See SDD "Encrypted upload" / TRD R2.
 *
 * `size` is accepted as a JS-safe number and converted to `BigInt` in the
 * service layer (the Prisma column is `BigInt`, which doesn't round-trip
 * through JSON directly). `encryptedKey`/`nonce`/`checksum` are required —
 * the schema has no default for them. See the envelope-encryption note in
 * repositories/interfaces/attachment.repository.interface.ts for what
 * `encryptedKey` is assumed to represent.
 */
export const createAttachmentSchema = z.object({
  messageId: z.string().uuid(),
  type: attachmentTypeSchema,
  fileName: z.string().min(1).max(255),
  originalFileName: z.string().max(255).optional(),
  mimeType: z.string().min(1).max(127),
  extension: z.string().max(16).optional(),
  size: z
    .number()
    .int()
    .positive()
    .max(500 * 1024 * 1024, "Attachment exceeds 500MB limit"),
  storageKey: z.string().min(1),
  thumbnailKey: z.string().optional(),
  previewKey: z.string().optional(),
  encryptedKey: z.string().min(1),
  nonce: z.string().min(1),
  checksum: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
});
export type CreateAttachmentDto = z.infer<typeof createAttachmentSchema>;

export const listAttachmentsQuerySchema = z.object({
  messageId: z.string().uuid(),
});
export type ListAttachmentsQueryDto = z.infer<typeof listAttachmentsQuerySchema>;

export const attachmentParamsSchema = z.object({
  id: z.string().uuid("Invalid attachment id"),
});
export type AttachmentParamsDto = z.infer<typeof attachmentParamsSchema>;

/**
 * POST /v1/attachments/upload-url — the first step of the upload flow: the
 * client encrypts the file locally, then asks for a presigned R2 PUT URL
 * to upload the ciphertext bytes directly (server/storage/client.ts),
 * before ever calling `createAttachmentSchema` to register the metadata.
 */
export const requestUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  extension: z.string().max(16).optional(),
});
export type RequestUploadUrlDto = z.infer<typeof requestUploadUrlSchema>;

export const uploadUrlResponseSchema = z.object({
  storageKey: z.string(),
  uploadUrl: z.string(),
  expiresInSeconds: z.number(),
});
export type UploadUrlResponseDto = z.infer<typeof uploadUrlResponseSchema>;

export const attachmentResponseSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  uploadedById: z.string(),
  type: attachmentTypeSchema,
  fileName: z.string(),
  originalFileName: z.string().nullable(),
  mimeType: z.string(),
  extension: z.string().nullable(),
  // BigInt doesn't serialize to JSON natively — represented as a string.
  size: z.string(),
  storageKey: z.string(),
  thumbnailKey: z.string().nullable(),
  previewKey: z.string().nullable(),
  // The recipient needs these to decrypt the downloaded ciphertext blob.
  encryptedKey: z.string(),
  nonce: z.string(),
  checksum: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  duration: z.number().nullable(),
  downloadCount: z.number(),
  uploadedAt: z.string().datetime(),
});
export type AttachmentResponseDto = z.infer<typeof attachmentResponseSchema>;

export const downloadUrlResponseSchema = attachmentResponseSchema.extend({
  downloadUrl: z.string(),
});
export type DownloadUrlResponseDto = z.infer<typeof downloadUrlResponseSchema>;
