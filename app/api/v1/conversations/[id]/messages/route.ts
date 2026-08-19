import type { NextRequest } from "next/server";
import { listMessagesQuerySchema } from "@/schemas/message.schema";
import { conversationParamsSchema } from "@/schemas/conversation.schema";
import { messageService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/** GET /v1/conversations/[id]/messages — message history for a conversation, paginated. */
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireUser(request);
    const { id } = conversationParamsSchema.parse(await context.params);
    const query = listMessagesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const messages = await messageService.listMessages(userId, id, query);
    return ok(messages);
  },
);
