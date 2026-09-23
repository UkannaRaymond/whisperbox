import type { Device, DevicePlatform } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

export interface CreateUserDeviceInput {
  userId: string;
  name: string;
  platform: DevicePlatform;
  devicePublicKey: string;
  fingerprint: string;
  deviceIdentifier: string;
  appVersion?: string;
  osVersion?: string;
}

export interface UpdateUserDeviceInput {
  name?: string;
  devicePublicKey?: string;
  trusted?: boolean;
  lastSeenAt?: Date;
}

export interface IDeviceRepository extends IBaseRepository<
  Device,
  CreateUserDeviceInput,
  UpdateUserDeviceInput
> {
  findByUserId(userId: string): Promise<Device[]>;
  touchLastActive(id: string): Promise<Device>;
  /** Looks up a user's existing device row by its public key, so logins reuse one row per physical device. */
  findByUserAndPublicKey(userId: string, devicePublicKey: string): Promise<Device | null>;
  /** Finds (creating if necessary) the device row for this user + public key. */
  findOrCreate(data: CreateUserDeviceInput): Promise<Device>;
}
