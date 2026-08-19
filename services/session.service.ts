import { auth } from "../lib/auth";
import { NotFoundError } from "../errors";
import type { SessionResponseDto } from "../schemas/session.schema";

/**
 * Session management, delegated entirely to Better Auth
 * (06-AUTHENTICATION.md: "Session Management" — rotation, revocation, and
 * multi-device tracking are Better Auth's job once a session exists;
 * `Session` rows are Better Auth's own core schema, not a WhisperBox table).
 *
 * The previous version of this file drove a hand-rolled
 * `repositories.sessions` / `repositories.refreshTokens` pair — both of
 * which referenced Prisma models (`Session.deviceId`, `RefreshToken`) that
 * don't exist in the current schema and have been removed. There is no
 * repository layer here anymore; `auth.api.*` is the source of truth.
 *
 * Every function takes the raw request `Headers` (cookie or bearer token)
 * rather than a `userId` — Better Auth resolves "whose sessions are these"
 * from the caller's own credentials, so there's no separate ownership
 * check to perform: you can only ever list/revoke your own sessions
 * through these endpoints, by construction.
 *
 * Implementation note: this assumes `auth.api.listSessions({ headers })`
 * resolves directly to a `Session[]` (matching the `auth.api.getSession`
 * convention of returning bare data rather than a client-SDK-style
 * `{ data, error }` envelope). Verify this against the actual installed
 * Better Auth version's types — this was implemented from documentation in
 * a sandbox with no live database to exercise it against.
 */

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.listSessions>>[number];

function toSessionResponse(
  session: BetterAuthSession,
  currentSessionId: string | undefined,
): SessionResponseDto {
  return {
    id: session.id,
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
    isCurrent: session.id === currentSessionId,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

/** Lists every active session for the caller — i.e. their logged-in devices/browsers. */
export async function listSessions(headers: Headers): Promise<SessionResponseDto[]> {
  const [sessions, current] = await Promise.all([
    auth.api.listSessions({ headers }),
    auth.api.getSession({ headers }),
  ]);

  return sessions.map((session) => toSessionResponse(session, current?.session.id));
}

/**
 * Revokes a single session — "remote logout" of one device/browser.
 *
 * NOTE: Better Auth's `revokeSession` API identifies sessions by their
 * `token`, not their `id` (the `id` is what we expose in our own DTO/route
 * param, matching REST convention and avoiding leaking the raw token in
 * the URL). This looks the session up via `listSessions` first to map our
 * `id` to Better Auth's `token`. Double-check this against the exact
 * `auth.api.revokeSession` signature for the Better Auth version actually
 * installed — this was implemented from documentation, not exercised
 * against a live instance in this environment.
 */
export async function revokeSession(headers: Headers, sessionId: string): Promise<void> {
  const sessions = await auth.api.listSessions({ headers });
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) throw new NotFoundError("Session", sessionId);

  await auth.api.revokeSession({ headers, body: { token: target.token } });
}

/** Revokes every session for the caller, including the current one — "logout everywhere". */
export async function revokeAllSessions(headers: Headers): Promise<void> {
  await auth.api.revokeSessions({ headers });
}
