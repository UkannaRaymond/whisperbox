import type { NextRequest } from "next/server";
import { attachmentParamsSchema } from "@/schemas/attachment.schema";
import { attachmentService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /v1/attachments/[id] — metadata only, no download URL (see the [id]/download-url route for that). */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = attachmentParamsSchema.parse(await params);
  const attachment = await attachmentService.getAttachment(userId, id);
  return ok(attachment);
});
