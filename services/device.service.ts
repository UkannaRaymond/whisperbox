import { repositories } from "../repositories/prisma";
import type {
  RegisterDeviceDto,
  DeviceResponseDto,
  RecipientDeviceKeyDto,
} from "../schemas/device.schema";

function toDeviceResponse(device: {
  id: string;
  userId: string;
  name: string;
  platform: DeviceResponseDto["platform"];
  devicePublicKey: string;
  fingerprint: string;
  trusted: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
}): DeviceResponseDto {
  return {
    id: device.id,
    userId: device.userId,
    name: device.name,
    platform: device.platform,
    devicePublicKey: device.devicePublicKey,
    fingerprint: device.fingerprint,
    trusted: device.trusted,
    lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    createdAt: device.createdAt.toISOString(),
  };
}

/**
 * Registers (or refreshes) the caller's current device's public identity
 * key. `findOrCreate` keys off `userId` + `devicePublicKey` so calling this
 * again with the same key on every login just touches `lastSeenAt`
 * instead of accumulating duplicate rows.
 */
export async function registerDevice(
  userId: string,
  dto: RegisterDeviceDto,
): Promise<DeviceResponseDto> {
  const device = await repositories.devices.findOrCreate({ userId, ...dto });
  return toDeviceResponse(device);
}

export async function listOwnDevices(userId: string): Promise<DeviceResponseDto[]> {
  const devices = await repositories.devices.findByUserId(userId);
  return devices.map(toDeviceResponse);
}

/**
 * Resolves each requested user's public key for encryption — the second
 * half of the blocker documented in
 * features/chat/utils/resolve-recipient-keys.ts. One key per user: if a
 * user has multiple devices, the most recently active one wins (there's
 * no multi-device fan-out / per-device key wrapping in this design — see
 * key-manager.service.ts's doc comment on why this project uses one
 * RSA-OAEP keypair per device rather than the X3DH tables in the schema).
 * Users with no active device are simply omitted from the result.
 */
export async function lookupRecipientDeviceKeys(
  userIds: string[],
): Promise<RecipientDeviceKeyDto[]> {
  const uniqueUserIds = Array.from(new Set(userIds));

  const results = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const devices = await repositories.devices.findByUserId(userId);
      if (devices.length === 0) return null;

      const mostRecentlyActive = devices.reduce((latest, device) => {
        const latestSeen = latest.lastSeenAt?.getTime() ?? 0;
        const candidateSeen = device.lastSeenAt?.getTime() ?? 0;
        return candidateSeen > latestSeen ? device : latest;
      });

      const key: RecipientDeviceKeyDto = {
        userId,
        deviceId: mostRecentlyActive.id,
        devicePublicKey: mostRecentlyActive.devicePublicKey,
        fingerprint: mostRecentlyActive.fingerprint,
      };
      return key;
    }),
  );

  return results.filter((key): key is RecipientDeviceKeyDto => key !== null);
}
