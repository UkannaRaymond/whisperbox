"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ConversationCard } from "./conversation-card";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/**
 * The scrollable conversation list itself — deliberately the ONLY
 * scrolling element in the sidebar (see sidebar-panel.tsx). Split out of
 * app-sidebar.tsx into its own file, paired with sidebar-list-header.tsx,
 * so "the part that stays put" and "the part that scrolls" are two
 * separate components rather than two halves of one function — much
 * harder to accidentally regress the static/scroll split that way.
 */
export function ConversationList({
  isLoading,
  hasAnyConversations,
  pinned,
  unpinned,
  activeConversationId,
}: {
  isLoading: boolean;
  /** Whether the user has any conversations at all, before search/tab filtering — distinguishes "no conversations yet" from "no conversations match your filter." */
  hasAnyConversations: boolean;
  pinned: LocalConversation[];
  unpinned: LocalConversation[];
  activeConversationId: string | undefined;
}) {
  if (isLoading) {
    return (
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" aria-label="Conversations">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </nav>
    );
  }

  const hasResults = pinned.length > 0 || unpinned.length > 0;

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" aria-label="Conversations">
      {hasResults ? (
        <>
          {pinned.length > 0 && (
            <>
              <p className="text-muted-foreground flex items-center gap-1 px-3 pt-1 pb-1 text-[11px] font-medium tracking-wide uppercase">
                Pinned
              </p>
              {pinned.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isActive={activeConversationId === conversation.id}
                />
              ))}
            </>
          )}
          {unpinned.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isActive={activeConversationId === conversation.id}
            />
          ))}
        </>
      ) : hasAnyConversations ? (
        <p className="text-muted-foreground p-3 text-sm">No conversations match.</p>
      ) : (
        <p className="text-muted-foreground p-3 text-sm">No conversations yet.</p>
      )}
    </nav>
  );
}
