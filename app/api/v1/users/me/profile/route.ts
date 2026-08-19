import type { NextRequest } from "next/server";
import { createProfileSchema } from "@/schemas/user.schema";
import { userService } from "@/services";
import { requireUser } from "@/http/guards";
import { created, withErrorHandling } from "@/http/response";

/** POST /v1/users/me/profile — create the caller's initial username/profile, once, right after sign-up. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const body = await request.json();
  const dto = createProfileSchema.parse(body);
  const user = await userService.createProfile(userId, dto);
  return created(user);
});
