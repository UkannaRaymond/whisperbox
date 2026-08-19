import { z } from "zod";

const devicePlatformSchema = z.enum(["WINDOWS", "MACOS", "LINUX", "ANDROID", "IOS", "WEB"]);

// POST /v1/devices — registers (or re-registers) this device's public
// identity key, once features/encryption/services/key-manager.service.ts
// has generated one. `deviceIdentifier` is a stable per-install id the
// client generates and persists locally (see lib/utils.ts); `fingerprint`
// is the SPKI fingerprint computed client-side
// (features/encryption/utils/fingerprint.ts) — the server never derives
// it, so two devices can't disagree about what a key's fingerprint is.
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

// GET /v1/devices/keys?userIds=a,b,c — the public-key half of the
// resolve-recipient-keys.ts blocker. Returns each requested user's most
// recently active, non-revoked device key, so a sender can wrap a
// per-message AES key for them (one wrapped key per USER, not per
// device — see the note on `encryptedKeySchema` in
// schemas/message.schema.ts). A user with no registered device yet (or
// whose only devices are revoked) simply doesn't appear in the response;
// the caller decides how to handle that (currently: fail the send with a
// clear "this recipient has no key yet" error rather than silently
// dropping them).
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
