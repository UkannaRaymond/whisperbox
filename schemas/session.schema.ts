import { z } from "zod";

// Better Auth's default ID generator does not produce RFC 4122 UUIDs, so
// session ids are validated as plain non-empty strings, not `.uuid()`.
export const sessionParamsSchema = z.object({
  id: z.string().min(1, "Invalid session id"),
});
export type SessionParamsDto = z.infer<typeof sessionParamsSchema>;

// (WhisperBox's `Device` model — E2E key identity — is
// intentionally separate from login sessions, see prisma/schema.prisma).
export const sessionResponseSchema = z.object({
  id: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  isCurrent: z.boolean(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type SessionResponseDto = z.infer<typeof sessionResponseSchema>;
