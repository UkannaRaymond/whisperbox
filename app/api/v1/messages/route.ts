import type { NextRequest } from "next/server";
import { createMessageSchema } from "@/schemas/message.schema";
import { messageService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/**
 * POST /v1/messages — send a message via REST (the offline sync engine's
 * push path; real-time delivery for online composes goes through the
 * Socket.IO gateway instead — see server/socket/handlers/send-message.handler.ts).
 * `clientMessageId` makes this safe to retry: the repository layer treats
 * it as an idempotency key.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const body = await request.json();
  const dto = createMessageSchema.parse(body);
  const message = await messageService.createMessage(userId, dto);
  return ok(message);
});
