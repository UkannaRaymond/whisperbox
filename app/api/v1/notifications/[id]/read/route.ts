import type { NextRequest } from "next/server";
import { notificationParamsSchema } from "@/schemas/notification.schema";
import { notificationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /v1/notifications/[id]/read — mark a single notification as read. */
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = notificationParamsSchema.parse(await params);
  const notification = await notificationService.markAsRead(userId, id);
  return ok(notification);
});
