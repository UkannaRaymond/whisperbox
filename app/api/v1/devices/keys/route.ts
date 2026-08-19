import type { NextRequest } from "next/server";
import { lookupDeviceKeysQuerySchema } from "@/schemas/device.schema";
import { deviceService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/**
 * GET /v1/devices/keys?userIds=a,b,c — the second endpoint named as a
 * blocker in features/chat/utils/resolve-recipient-keys.ts. Requires
 * auth (any signed-in user can look up any other user's device public
 * key — that's intentional: it's how end-to-end encryption to them
 * works at all, the same way a public key being "public" is intentional
 * in any E2E design), but does not require the caller to share a
 * conversation with the looked-up users, since group creation itself
 * needs to resolve keys for people who aren't members of anything yet.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireUser(request);
  const { userIds } = lookupDeviceKeysQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const keys = await deviceService.lookupRecipientDeviceKeys(userIds);
  return ok(keys);
});
