import type { NextRequest } from "next/server";
import { sessionParamsSchema } from "@/schemas/session.schema";
import { sessionService } from "@/services";
import { requireUser } from "@/http/guards";
import { noContent, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /v1/sessions/{id} — revoke a single session (remote logout of one
 * device/browser). Better Auth's own session APIs only ever operate on the
 * caller's own sessions, so there's no separate ownership check to write
 * here: a session id that isn't yours simply won't be found.
 */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  await requireUser(request);
  const { id } = sessionParamsSchema.parse(await params);
  await sessionService.revokeSession(request.headers, id);
  return noContent();
});
