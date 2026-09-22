import type { NextRequest } from "next/server";
import { notificationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** POST /v1/notifications/read-all — marks every unread notification for the caller as read. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const result = await notificationService.markAllAsRead(userId);
  return ok(result);
});
