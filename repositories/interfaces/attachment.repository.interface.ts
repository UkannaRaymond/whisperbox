import type { Attachment, AttachmentType } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

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
