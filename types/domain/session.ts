/**
 * Domain representation of an authenticated session, for frontend
 * consumption. Re-exports the real DTO (schemas/session.schema.ts) — see
 * the note in user.ts.
 *
 * The previous version of this file modeled `deviceId: string | null` on
 * the session itself. Since the Better Auth migration, login sessions
 * (`Session`, Better Auth's own core model) and E2E device identity
 * (`Device`, this project's own model) are deliberately two separate
 * concepts with no FK between them — see the header comment in
 * prisma/schema.prisma. A session has no `deviceId` to model.
 */
export type { SessionResponseDto as Session } from "@/schemas/session.schema";
