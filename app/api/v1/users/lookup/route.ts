import type { NextRequest } from "next/server";
import { lookupUserQuerySchema } from "@/schemas/user.schema";
import { userService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** GET /v1/users/lookup?handle=... — resolve a username or email to a user. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireUser(request);
  const { handle } = lookupUserQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const user = await userService.lookupUser(handle);
  return ok(user);
});
