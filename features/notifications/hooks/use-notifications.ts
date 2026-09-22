"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  NotificationResponseDto,
  UnreadCountResponseDto,
} from "@/schemas/notification.schema";

export const notificationsQueryKey = ["notifications"] as const;
export const unreadNotificationCountQueryKey = ["notifications", "unread-count"] as const;

export function useNotifications() {
  return useQuery<NotificationResponseDto[]>({
    queryKey: notificationsQueryKey,
    queryFn: () => apiFetch<NotificationResponseDto[]>("/api/v1/notifications"),
  });
}

export function useUnreadNotificationCount() {
  return useQuery<UnreadCountResponseDto>({
    queryKey: unreadNotificationCountQueryKey,
    queryFn: () => apiFetch<UnreadCountResponseDto>("/api/v1/notifications/unread-count"),
  });
}

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  void queryClient.invalidateQueries({ queryKey: unreadNotificationCountQueryKey });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(`/api/v1/notifications/${notificationId}/read`, { method: "POST" });
    },
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
    },
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(`/api/v1/notifications/${notificationId}/dismiss`, { method: "DELETE" });
    },
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}
