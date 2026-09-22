import type { NextRequest } from "next/server";
import { notificationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** GET /v1/notifications/unread-count — for the bell badge; polled/refetched rather than pushed over the socket. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const result = await notificationService.getUnreadCount(userId);
  return ok(result);
});
