"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SyncEngine from "@/features/offline/services/sync-engine";
import type { TimelineEntry } from "@/features/offline/types/offline.types";

export function timelineQueryKey(conversationId: string) {
  return ["conversation-timeline", conversationId] as const;
}

/**
 * A conversation's message timeline — server-confirmed messages merged
 * with any still-pending/queued sends (features/offline/services/
 * sync-engine.ts#getConversationTimeline, Stage 09), which is what
 * actually enables optimistic UI (10-FRONTEND.md § Core Features): a
 * message the composer just queued shows up immediately, in place, before
 * the network round-trip (or reconnection) that delivers it.
 */
export function useConversationTimeline(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<TimelineEntry[]>({
    queryKey: timelineQueryKey(conversationId ?? ""),
    queryFn: async () => {
      if (!conversationId) return [];
      await SyncEngine.pullNewMessages(conversationId).catch(() => {});
      return SyncEngine.getConversationTimeline(conversationId);
    },
    enabled: conversationId !== null,
    staleTime: 5_000,
  });

  const invalidate = () => {
    if (conversationId) {
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(conversationId) });
    }
  };

  return { ...query, invalidate };
}
