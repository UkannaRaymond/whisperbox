import { randomBytes } from "node:crypto";
import { getRedisClient } from "../redis/client";

/**
 * Short-lived, single-use "connection tickets" for authenticating the
 * Socket.IO handshake.
 *
 * Why this exists instead of just forwarding the Better Auth session
 * cookie: lib/auth.ts sets the session cookie with `sameSite: "strict"`,
 * `httpOnly: true`, and no cross-subdomain `domain` attribute
 * (`cookiePrefix: "whisperbox"`, no `advanced.crossSubDomainCookies`). That
 * means:
 *   1. The cookie is scoped to the exact host that set it — it will not be
 *      sent to a Socket.IO server running on a different host/subdomain
 *      than the Next.js app (which `NEXT_PUBLIC_SOCKET_URL` being a
 *      separate public URL strongly implies this deployment has).
 *   2. Being httpOnly, client-side JS can't read the cookie value itself
 *      to forward it manually either.
 *
 * So: the client calls a same-origin REST endpoint first (which DOES have
 * the cookie, since it's same-origin — see
 * app/api/v1/realtime/ticket/route.ts), gets back a random ticket, and
 * presents that ticket to the (possibly different-origin) socket server
 * during the handshake instead. The ticket is single-use and expires in
 * seconds, limiting how much a leaked ticket (e.g. via a proxy log) is
 * worth to an attacker.
 */

const TICKET_PREFIX = "socket-ticket:";
const TICKET_TTL_SECONDS = 30;

export async function issueSocketTicket(userId: string): Promise<string> {
  const redis = await getRedisClient();
  const ticket = randomBytes(32).toString("hex");
  await redis.set(`${TICKET_PREFIX}${ticket}`, userId, "EX", TICKET_TTL_SECONDS);
  return ticket;
}

/**
 * Consumes a ticket: returns the associated userId and deletes it
 * atomically (so it can never be used twice), or null if it doesn't exist
 * or already expired.
 *
 * Uses `GETDEL` (Redis >= 6.2) for atomicity. If you're running an older
 * Redis, replace this with a small Lua script (`GET` + `DEL` as two
 * separate commands has a race window where the same ticket could be
 * consumed twice by concurrent requests).
 */
export async function consumeSocketTicket(ticket: string): Promise<string | null> {
  const redis = await getRedisClient();
  const userId = await redis.getdel(`${TICKET_PREFIX}${ticket}`);
  return userId ?? null;
}
