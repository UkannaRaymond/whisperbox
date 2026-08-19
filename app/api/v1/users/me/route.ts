import type { NextRequest } from "next/server";
import { updateMeSchema } from "@/schemas/user.schema";
import { userService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** GET /v1/users/me — the caller's own profile. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const user = await userService.getMe(userId);
  return ok(user);
});

/** PATCH /v1/users/me — update the caller's own profile fields. */
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const body = await request.json();
  const dto = updateMeSchema.parse(body);
  const user = await userService.updateMe(userId, dto);
  return ok(user);
});
