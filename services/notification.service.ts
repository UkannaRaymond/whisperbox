import { repositories } from "../repositories/prisma";
import { NotFoundError, ForbiddenError } from "../errors";
import type { Notification } from "@prisma/client";
import type {
  ListNotificationsQueryDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from "../schemas/notification.schema";
import type { CreateNotificationInput } from "../repositories/interfaces/notification.repository.interface";

/**
 * Notifications service — the previous version of this file was a
 * type-only interface (`NotificationService`/`NotificationPayload`) with
 * no implementation anywhere; `repositories.notifications`
 * (repositories/prisma/notification.repository.ts) already existed, fully
 * built, with nothing above it.
 *
 * This deliberately does NOT attempt actual push/desktop/email delivery
 * (the old interface's `channel` field implied) — that's a real external
 * integration (web push subscriptions, APNs/FCM, an email provider) out
 * of scope here. What this DOES do: persist a `Notification` row (the
 * in-app notification center / bell dropdown's data source) and expose
 * read/dismiss/unread-count operations against it. `notify()` is the
 * single entry point other services call to create one; nothing calls it
 * yet (wiring notify() into message.service.ts / conversation.service.ts
 * for "new message"/"added to group" notifications is a follow-up, not a
 * blocker for the notification center itself to work end-to-end for
 * notifications created via those future call sites).
 */

function toNotificationResponse(notification: Notification): NotificationResponseDto {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    payload: (notification.payload as Record<string, unknown> | null) ?? null,
    read: notification.read,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    dismissed: notification.dismissed,
    createdAt: notification.createdAt.toISOString(),
  };
}

/** Creates a notification for a user. The single entry point other services should call to notify someone of something. */
export async function notify(input: CreateNotificationInput): Promise<NotificationResponseDto> {
  const notification = await repositories.notifications.create(input);
  return toNotificationResponse(notification);
}

export async function listNotifications(
  userId: string,
  query: ListNotificationsQueryDto,
): Promise<NotificationResponseDto[]> {
  const notifications = await repositories.notifications.findByUserId(userId, query);
  return notifications.map(toNotificationResponse);
}

export async function getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
  const count = await repositories.notifications.countUnread(userId);
  return { count };
}

async function assertOwnership(userId: string, notificationId: string): Promise<Notification> {
  const notification = await repositories.notifications.findById(notificationId);
  if (!notification) throw new NotFoundError("Notification", notificationId);
  if (notification.userId !== userId) {
    throw new ForbiddenError("You do not have access to this notification");
  }
  return notification;
}

export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<NotificationResponseDto> {
  await assertOwnership(userId, notificationId);
  const notification = await repositories.notifications.markAsRead(notificationId);
  return toNotificationResponse(notification);
}

export async function markAllAsRead(userId: string): Promise<{ count: number }> {
  const count = await repositories.notifications.markAllAsRead(userId);
  return { count };
}

export async function dismissNotification(userId: string, notificationId: string): Promise<void> {
  await assertOwnership(userId, notificationId);
  await repositories.notifications.softDelete(notificationId);
}
