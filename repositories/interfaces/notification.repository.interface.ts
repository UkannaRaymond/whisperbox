import type { Notification, NotificationType } from "@prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface UpdateNotificationInput {
  isRead?: boolean;
  readAt?: Date;
}

export interface INotificationRepository extends IBaseRepository<
  Notification,
  CreateNotificationInput,
  UpdateNotificationInput
> {
  findByUserId(
    userId: string,
    params?: { take?: number; cursor?: string; unreadOnly?: boolean },
  ): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
}
