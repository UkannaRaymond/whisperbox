import type { NextRequest } from "next/server";
import { conversationParamsSchema } from "@/schemas/conversation.schema";
import { conversationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

/**
 * GET /v1/conversations/[id]/members — a conversation's active members.
 *
 * This is the first of the two endpoints named as blockers in
 * features/chat/utils/resolve-recipient-keys.ts: without it there was no
 * way to find out who a message needed to be encrypted for. Membership is
 * enforced the same way `GET /v1/conversations/[id]` enforces it — only
 * current members can see the member list.
 */
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireUser(request);
    const { id } = conversationParamsSchema.parse(await context.params);
    const members = await conversationService.listMembers(userId, id);
    return ok(members);
  },
);
