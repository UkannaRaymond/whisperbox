import type { NextRequest } from "next/server";
import { attachmentParamsSchema } from "@/schemas/attachment.schema";
import { attachmentService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /v1/attachments/[id]/download-url — a fresh, short-lived presigned GET URL for the encrypted blob. Counts as a download. */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = attachmentParamsSchema.parse(await params);
  const result = await attachmentService.getAttachmentDownloadUrl(userId, id);
  return ok(result);
});
