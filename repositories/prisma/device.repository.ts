import type { PrismaClient, Device } from "@prisma/client";
import type {
  IDeviceRepository,
  CreateUserDeviceInput,
  UpdateUserDeviceInput,
} from "../interfaces/device.repository.interface";
import { NotFoundError } from "../../errors";

export class DeviceRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findFirst({ where: { id, revoked: false } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { revoked: false },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: CreateUserDeviceInput): Promise<Device> {
    return this.prisma.device.create({ data });
  }

  async update(id: string, data: UpdateUserDeviceInput): Promise<Device> {
    await this.assertExists(id);
    return this.prisma.device.update({ where: { id }, data });
  }

  // Devices don't have a `deletedAt` column — losing/rotating a device is
  // modeled as revocation instead, which still lets us keep the audit trail.
  async softDelete(id: string): Promise<Device> {
    await this.assertExists(id);
    return this.prisma.device.update({
      where: { id },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.device.delete({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { userId, revoked: false },
      orderBy: { createdAt: "asc" },
    });
  }

  async touchLastActive(id: string): Promise<Device> {
    await this.assertExists(id);
    return this.prisma.device.update({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  async findByUserAndPublicKey(userId: string, devicePublicKey: string): Promise<Device | null> {
    return this.prisma.device.findFirst({
      where: { userId, devicePublicKey, revoked: false },
    });
  }

  async findOrCreate(data: CreateUserDeviceInput): Promise<Device> {
    const existing = await this.findByUserAndPublicKey(data.userId, data.devicePublicKey);
    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), name: data.name },
      });
    }
    return this.prisma.device.create({ data: { ...data, lastSeenAt: new Date() } });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.device.findFirst({
      where: { id, revoked: false },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Device", id);
  }
}
