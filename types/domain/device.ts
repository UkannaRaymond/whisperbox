/**
 * A device registered to a user for multi-device, end-to-end encrypted
 * messaging. `publicKey` is the device's public identity key, used by
 * other devices to wrap per-conversation keys for it — the private
 * counterpart never leaves the device and is never modeled server-side.
 *
 * Unlike the other files in this folder, this one is NOT reconciled
 * against a real DTO — no `/v1/devices` REST endpoint or schema exists
 * yet in this codebase (device registration/listing was never built in
 * any prior stage), so there's no ground truth to check this shape
 * against. The real Prisma `Device` model (prisma/schema.prisma) has
 * different field names (`deviceName`, `devicePublicKey`, `fingerprint`,
 * `trusted`, `revoked`, `platform`, ...) — treat this type as aspirational
 * until that endpoint exists, not as verified.
 */
export interface Device {
  id: string;
  userId: string;
  label: string;
  publicKey: string;
  createdAt: Date;
  lastActiveAt: Date;
}
