import { repositories } from "../repositories/prisma";
import { ForbiddenError, NotFoundError } from "../errors";
import { toAttachmentResponse } from "./mappers";
import { generateStorageKey, getUploadUrl, getDownloadUrl } from "../server/storage/client";
import type {
  CreateAttachmentDto,
  AttachmentResponseDto,
  RequestUploadUrlDto,
  UploadUrlResponseDto,
  DownloadUrlResponseDto,
} from "../schemas/attachment.schema";

/**
 * Step 1 of the upload flow (see requestUploadUrlSchema's doc comment):
 * mints a fresh object key and a short-lived presigned PUT URL the client
 * uploads the already-encrypted file bytes to directly. Doesn't touch the
 * database — the `Attachment` row is only created once `createAttachment`
 * below is called with the resulting `storageKey`.
 */
export async function requestUploadUrl(
  userId: string,
  dto: RequestUploadUrlDto,
): Promise<UploadUrlResponseDto> {
  const storageKey = generateStorageKey(userId, dto.extension);
  const { url, expiresInSeconds } = await getUploadUrl(storageKey, dto.mimeType);
  return { storageKey, uploadUrl: url, expiresInSeconds };
}

export async function createAttachment(
  userId: string,
  dto: CreateAttachmentDto,
): Promise<AttachmentResponseDto> {
  const message = await repositories.messages.findById(dto.messageId);
  if (!message) throw new NotFoundError("Message", dto.messageId);

  if (message.senderId !== userId) {
    throw new ForbiddenError("Only the message sender can attach files to it");
  }

  // Prisma's `size` column is BigInt; the DTO carries a JSON-safe number.
  const attachment = await repositories.attachments.create({
    ...dto,
    uploadedById: userId,
    size: BigInt(dto.size),
  });

  return toAttachmentResponse(attachment);
}

/** Shared access check for both `getAttachment` and `getAttachmentDownloadUrl` — only active members of the parent message's conversation may read an attachment. */
async function assertAttachmentAccess(userId: string, attachmentId: string) {
  const attachment = await repositories.attachments.findById(attachmentId);
  if (!attachment) throw new NotFoundError("Attachment", attachmentId);

  const message = await repositories.messages.findById(attachment.messageId);
  if (!message) throw new NotFoundError("Message", attachment.messageId);

  const membership = await repositories.conversationMembers.findByConversationAndUser(
    message.conversationId,
    userId,
  );
  if (!membership || membership.leftAt) {
    throw new ForbiddenError("You do not have access to this attachment");
  }

  return attachment;
}

export async function getAttachment(
  userId: string,
  attachmentId: string,
): Promise<AttachmentResponseDto> {
  const attachment = await assertAttachmentAccess(userId, attachmentId);
  return toAttachmentResponse(attachment);
}

/**
 * Lists every attachment on a message — what powers the chat bubble's
 * "this message has a file" display. Access is checked once against the
 * message/conversation (same rule as a single attachment: only active
 * conversation members may read), not per-attachment-row, since they all
 * belong to the same message.
 */
export async function listAttachmentsForMessage(
  userId: string,
  messageId: string,
): Promise<AttachmentResponseDto[]> {
  const message = await repositories.messages.findById(messageId);
  if (!message) throw new NotFoundError("Message", messageId);

  const membership = await repositories.conversationMembers.findByConversationAndUser(
    message.conversationId,
    userId,
  );
  if (!membership || membership.leftAt) {
    throw new ForbiddenError("You do not have access to this message's attachments");
  }

  const attachments = await repositories.attachments.findByMessageId(messageId);
  return attachments.map(toAttachmentResponse);
}

/** Step 2 of the download flow: metadata plus a fresh, short-lived presigned GET URL for the still-encrypted blob. Counts as a download. */
export async function getAttachmentDownloadUrl(
  userId: string,
  attachmentId: string,
): Promise<DownloadUrlResponseDto> {
  const attachment = await assertAttachmentAccess(userId, attachmentId);
  const { url } = await getDownloadUrl(attachment.storageKey);
  const updated = await repositories.attachments.incrementDownloadCount(attachmentId);
  return { ...toAttachmentResponse(updated), downloadUrl: url };
}
