import type { PrismaClient, Notification, Prisma } from "@/lib/generated/prisma/client";
import type {
  INotificationRepository,
  CreateNotificationInput,
  UpdateNotificationInput,
} from "../interfaces/notification.repository.interface";
import { NotFoundError } from "../../errors";

/**
 * Field names here follow the actual `Notification` model in
 * prisma/schema.prisma: `read`/`readAt` (not `isRead`), `payload` (not
 * `data`), and no `deletedAt` column at all — there's `dismissed`/
 * `dismissedAt` instead, which is what "soft delete" maps to below. The
 * previous version of this file used `isRead`/`data`/`deletedAt`
 * throughout and papered over the mismatch with an `as any` cast in
 * `create()`; it happened to still typecheck because `@prisma/client`'s
 * `Notification` type wasn't resolvable in this environment, so none of
 * the field-name errors below were actually being caught.
 */
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.data as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(id: string, input: UpdateNotificationInput): Promise<Notification> {
    await this.assertExists(id);
    return this.prisma.notification.update({
      where: { id },
      data: { read: input.isRead, readAt: input.readAt },
    });
  }

  /** No `deletedAt` column exists on `Notification` — dismissing is this model's equivalent of soft delete. */
  async softDelete(id: string): Promise<Notification> {
    await this.assertExists(id);
    return this.prisma.notification.update({
      where: { id },
      data: { dismissed: true, dismissedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } });
  }

  async findByUserId(
    userId: string,
    params?: { take?: number; cursor?: string; unreadOnly?: boolean },
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId, ...(params?.unreadOnly ? { read: false } : {}) },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    await this.assertExists(id);
    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return result.count;
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Notification", id);
  }
}
