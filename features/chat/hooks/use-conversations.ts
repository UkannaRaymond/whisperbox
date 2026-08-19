"use client";

import { useQuery } from "@tanstack/react-query";
import * as OfflineDb from "@/features/offline/services/offline-db";
import * as SyncEngine from "@/features/offline/services/sync-engine";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/**
 * Conversation list (10-FRONTEND.md § Core Screens: "Conversation List").
 *
 * Offline-first: the `queryFn` triggers a best-effort background sync
 * (features/offline/services/sync-engine.ts, built in Stage 09) and then
 * reads from IndexedDB — never a raw, always-online fetch. If the sync
 * fails (offline), the query still resolves with whatever's cached
 * locally rather than erroring, since "no network" isn't actually a
 * failure state for an offline-first app.
 */
export function useConversations() {
  return useQuery<LocalConversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      await SyncEngine.pullConversations().catch(() => {
        // Offline or the request failed — fall through to the local cache.
      });
      return OfflineDb.getAllConversations();
    },
    staleTime: 10_000,
  });
}
