import type { NextRequest } from "next/server";
import { createAttachmentSchema, listAttachmentsQuerySchema } from "@/schemas/attachment.schema";
import { attachmentService } from "@/services";
import { requireUser } from "@/http/guards";
import { created, ok, withErrorHandling } from "@/http/response";

/** GET /v1/attachments?messageId=... — every attachment on a message. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const { messageId } = listAttachmentsQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const attachments = await attachmentService.listAttachmentsForMessage(userId, messageId);
  return ok(attachments);
});

/**
 * POST /v1/attachments — registers an already-uploaded object's metadata
 * against a message. Call `/v1/attachments/upload-url` first to get a
 * `storageKey` and presigned PUT URL, upload the encrypted bytes there,
 * then call this with the resulting `storageKey`.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const dto = createAttachmentSchema.parse(await request.json());
  const attachment = await attachmentService.createAttachment(userId, dto);
  return created(attachment);
});
