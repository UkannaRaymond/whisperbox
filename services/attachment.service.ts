import { repositories } from "../repositories/prisma";
import { ForbiddenError, NotFoundError } from "../errors";
import { toAttachmentResponse } from "./mappers";
import type { CreateAttachmentDto, AttachmentResponseDto } from "../schemas/attachment.schema";

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

export async function getAttachment(
  userId: string,
  attachmentId: string,
): Promise<AttachmentResponseDto> {
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

  return toAttachmentResponse(attachment);
}
