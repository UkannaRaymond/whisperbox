import type { NextRequest } from "next/server";
import { sessionService } from "@/services";
import { requireUser } from "@/http/guards";
import { noContent, ok, withErrorHandling } from "@/http/response";

/** GET /v1/sessions — list the caller's active sessions (logged-in devices/browsers). */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireUser(request); // just confirms there's a valid session; listing itself is Better Auth's job
  const sessions = await sessionService.listSessions(request.headers);
  return ok(sessions);
});

/** DELETE /v1/sessions — "logout everywhere": revokes every session for the caller. */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  await requireUser(request);
  await sessionService.revokeAllSessions(request.headers);
  return noContent();
});
