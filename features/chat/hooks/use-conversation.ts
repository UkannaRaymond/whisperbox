"use client";

import { useQuery } from "@tanstack/react-query";
import * as OfflineDb from "@/features/offline/services/offline-db";
import { apiFetch } from "@/lib/api-client";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/** A single conversation by id — IndexedDB-first, falling back to a direct fetch of `GET /v1/conversations/{id}` on a cache miss (e.g. a deep link to a conversation this device hasn't synced the list for yet). */
export function useConversation(conversationId: string | null) {
  return useQuery<LocalConversation | null>({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const cached = await OfflineDb.getConversation(conversationId);
      if (cached) return cached;

      const fetched = await apiFetch<LocalConversation>(`/api/v1/conversations/${conversationId}`);
      await OfflineDb.putConversation(fetched);
      return fetched;
    },
    enabled: conversationId !== null,
  });
}
