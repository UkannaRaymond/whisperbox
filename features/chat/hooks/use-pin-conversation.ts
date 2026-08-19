"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import * as OfflineDb from "@/features/offline/services/offline-db";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/**
 * Pin/unpin a conversation (`PATCH /v1/conversations/[id]`,
 * app/api/v1/conversations/[id]/route.ts — `ConversationMember.pinned`,
 * per-viewer, never affects anyone else's list). Optimistically updates
 * both the local IndexedDB cache (so `useConversations`' next read
 * reflects it immediately, offline-first) and the react-query cache for
 * this conversation, rolling back on failure.
 */
export function usePinConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, pinned }: { conversationId: string; pinned: boolean }) => {
      await apiFetch(`/api/v1/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      return { conversationId, pinned };
    },
    onMutate: async ({ conversationId, pinned }) => {
      const previous = await OfflineDb.getConversation(conversationId);
      if (previous) {
        await OfflineDb.putConversation({ ...previous, pinned });
      }
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData<LocalConversation[]>(["conversations"], (old) =>
        old?.map((c) => (c.id === conversationId ? { ...c, pinned } : c)),
      );
      return { previous };
    },
    onError: async (_err, _variables, context) => {
      if (context?.previous) await OfflineDb.putConversation(context.previous);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
