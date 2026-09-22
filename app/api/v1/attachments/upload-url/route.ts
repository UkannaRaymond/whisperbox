import type { NextRequest } from "next/server";
import { requestUploadUrlSchema } from "@/schemas/attachment.schema";
import { attachmentService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** POST /v1/attachments/upload-url — mints a presigned R2 PUT URL for a new, encrypted-client-side attachment upload. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const dto = requestUploadUrlSchema.parse(await request.json());
  const result = await attachmentService.requestUploadUrl(userId, dto);
  return ok(result);
});
