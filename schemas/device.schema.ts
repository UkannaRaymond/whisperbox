import { z } from "zod";

const devicePlatformSchema = z.enum(["WINDOWS", "MACOS", "LINUX", "ANDROID", "IOS", "WEB"]);

export const registerDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  platform: devicePlatformSchema,
  devicePublicKey: z.string().min(1, "devicePublicKey is required"),
  fingerprint: z.string().min(1, "fingerprint is required"),
  deviceIdentifier: z.string().min(1, "deviceIdentifier is required"),
  appVersion: z.string().max(50).optional(),
  osVersion: z.string().max(50).optional(),
});
export type RegisterDeviceDto = z.infer<typeof registerDeviceSchema>;

export const deviceResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  platform: devicePlatformSchema,
  devicePublicKey: z.string(),
  fingerprint: z.string(),
  trusted: z.boolean(),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type DeviceResponseDto = z.infer<typeof deviceResponseSchema>;

export const lookupDeviceKeysQuerySchema = z.object({
  userIds: z
    .string()
    .min(1, "userIds is required")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1, "At least one userId is required").max(200)),
});
export type LookupDeviceKeysQueryDto = z.infer<typeof lookupDeviceKeysQuerySchema>;

export const recipientDeviceKeySchema = z.object({
  userId: z.string(),
  deviceId: z.string().uuid(),
  devicePublicKey: z.string(),
  fingerprint: z.string(),
});
export type RecipientDeviceKeyDto = z.infer<typeof recipientDeviceKeySchema>;
