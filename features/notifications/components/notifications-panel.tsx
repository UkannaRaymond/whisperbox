"use client";

import { Bell, Check, Loader2, MessageCircle, UserPlus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useDismissNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/hooks/use-notifications";
import type { NotificationResponseDto } from "@/schemas/notification.schema";

const ICONS_BY_TYPE: Record<NotificationResponseDto["type"], typeof MessageCircle> = {
  MESSAGE: MessageCircle,
  MENTION: MessageCircle,
  CONTACT_REQUEST: UserPlus,
  GROUP_INVITE: Users,
  SYSTEM: Bell,
};

/** Notifications list and read/dismiss actions. */
export function NotificationsPanel() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread = notifications?.some((n) => !n.read) ?? false;

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Notifications</h1>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasUnread || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <Check className="size-4" aria-hidden="true" />
          Mark all as read
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {isLoading && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading notifications…
            </div>
          )}

          {isError && (
            <p className="text-destructive px-6 py-16 text-center text-sm">
              Couldn't load your notifications. Try refreshing.
            </p>
          )}

          {!isLoading && !isError && notifications?.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center text-sm">
              <Bell className="size-8" aria-hidden="true" />
              <p>You're all caught up.</p>
            </div>
          )}

          {notifications?.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function NotificationRow({ notification }: { notification: NotificationResponseDto }) {
  const router = useRouter();
  const markRead = useMarkNotificationRead();
  const dismiss = useDismissNotification();
  const Icon = ICONS_BY_TYPE[notification.type] ?? Bell;

  function handleClick() {
    if (!notification.read) markRead.mutate(notification.id);
    const conversationId = notification.payload?.conversationId;
    if (typeof conversationId === "string") {
      router.push(`/conversations/${conversationId}`);
    }
  }

  return (
    <div
      className={cn(
        "group hover:bg-accent/50 flex items-start gap-3 border-b px-6 py-3 last:border-b-0",
        !notification.read && "bg-primary/5",
      )}
    >
      <button type="button" onClick={handleClick} className="flex flex-1 items-start gap-3 text-left">
        <div
          className={cn(
            "bg-muted mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
            !notification.read && "bg-primary/15 text-primary",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm", !notification.read && "font-semibold")}>
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-muted-foreground truncate text-sm">{notification.body}</p>
          )}
          <p className="text-muted-foreground mt-0.5 text-xs">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        {!notification.read && (
          <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-hidden="true" />
        )}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 group-hover:opacity-100"
        aria-label="Dismiss notification"
        onClick={() => dismiss.mutate(notification.id)}
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
