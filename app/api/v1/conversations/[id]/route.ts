import type { NextRequest } from "next/server";
import {
  conversationParamsSchema,
  updateConversationViewerStateSchema,
} from "@/schemas/conversation.schema";
import { conversationService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, noContent, withErrorHandling } from "@/http/response";

/**
 * GET /v1/conversations/[id] — a single conversation by id.
 *
 * This route did not exist: `features/chat/hooks/use-conversation.ts` calls
 * `GET /api/v1/conversations/{id}` as its cache-miss fallback (e.g. a deep
 * link to a conversation the sidebar hasn't synced yet), but with no
 * handler here that request 404'd, `useConversation` never resolved, and
 * `app/(app)/conversations/[id]/page.tsx` stayed stuck on its loading
 * skeleton forever — which also meant the message composer at the bottom
 * of the page never rendered, since it sits behind the
 * `isLoadingConversation || !conversation` early return.
 */
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireUser(request);
    const { id } = conversationParamsSchema.parse(await context.params);
    const conversation = await conversationService.getConversation(userId, id);
    return ok(conversation);
  },
);

/**
 * PATCH /v1/conversations/[id] — pin/unpin, for this caller only. See
 * `updateConversationViewerStateSchema`'s doc comment for why this is
 * scoped separately from a general conversation-update endpoint.
 */
export const PATCH = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireUser(request);
    const { id } = conversationParamsSchema.parse(await context.params);
    const { pinned } = updateConversationViewerStateSchema.parse(await request.json());
    await conversationService.setConversationPinned(userId, id, pinned);
    return noContent();
  },
);
