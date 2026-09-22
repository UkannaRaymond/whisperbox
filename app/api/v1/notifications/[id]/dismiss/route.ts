import type { NextRequest } from "next/server";
import { notificationParamsSchema } from "@/schemas/notification.schema";
import { notificationService } from "@/services";
import { requireUser } from "@/http/guards";
import { noContent, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** DELETE /v1/notifications/[id]/dismiss — dismiss (this model's soft-delete equivalent) a notification. */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = notificationParamsSchema.parse(await params);
  await notificationService.dismissNotification(userId, id);
  return noContent();
});
