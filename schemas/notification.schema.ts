import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "MESSAGE",
  "MENTION",
  "CONTACT_REQUEST",
  "GROUP_INVITE",
  "SYSTEM",
]);

export const listNotificationsQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().uuid().optional(),
  unreadOnly: z.coerce.boolean().optional(),
});
export type ListNotificationsQueryDto = z.infer<typeof listNotificationsQuerySchema>;

export const notificationParamsSchema = z.object({
  id: z.string().uuid("Invalid notification id"),
});
export type NotificationParamsDto = z.infer<typeof notificationParamsSchema>;

export const notificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  read: z.boolean(),
  readAt: z.string().datetime().nullable(),
  dismissed: z.boolean(),
  createdAt: z.string().datetime(),
});
export type NotificationResponseDto = z.infer<typeof notificationResponseSchema>;

export const unreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type UnreadCountResponseDto = z.infer<typeof unreadCountResponseSchema>;
