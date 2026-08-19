import type { NextRequest } from "next/server";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";
import { issueSocketTicket } from "@/server/socket/ticket.service";

/**
 * POST /v1/realtime/ticket — mints a short-lived, single-use ticket the
 * client presents to the Socket.IO server's handshake in place of the
 * (same-origin-only, httpOnly) session cookie. See
 * server/socket/ticket.service.ts for why this exists instead of just
 * forwarding the cookie.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const ticket = await issueSocketTicket(userId);
  return ok({ ticket, expiresInSeconds: 30 });
});
