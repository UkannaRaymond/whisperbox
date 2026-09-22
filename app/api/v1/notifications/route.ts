import type { NextRequest } from "next/server";
import { listNotificationsQuerySchema } from "@/schemas/notification.schema";
import { notificationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** GET /v1/notifications — the caller's notifications, newest first. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const query = listNotificationsQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const notifications = await notificationService.listNotifications(userId, query);
  return ok(notifications);
});
