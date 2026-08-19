import type { NextRequest } from "next/server";
import {
  createConversationSchema,
  listConversationsQuerySchema,
} from "@/schemas/conversation.schema";
import { conversationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** GET /v1/conversations — the caller's conversations, paginated. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const query = listConversationsQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const conversations = await conversationService.listConversations(userId, query);
  return ok(conversations);
});

/** POST /v1/conversations — start a DIRECT conversation, or create a GROUP. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const body = await request.json();
  const dto = createConversationSchema.parse(body);
  const conversation = await conversationService.createConversation(userId, dto);
  return ok(conversation);
});
