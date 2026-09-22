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
      <nav className="min-h-0 overflow-y-auto" aria-label="Conversations" aria-busy="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex h-[72px] items-center gap-3 px-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </nav>
    );
  }

  const hasResults = pinned.length > 0 || unpinned.length > 0;

  return (
    <nav className="min-h-0 overflow-y-auto overscroll-contain" aria-label="Conversations">
      {hasResults ? (
        <>
          {pinned.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isActive={activeConversationId === conversation.id}
            />
          ))}
          {unpinned.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isActive={activeConversationId === conversation.id}
            />
          ))}
        </>
      ) : hasAnyConversations ? (
        <p className="text-muted-foreground px-6 py-10 text-center text-sm">
          No chats match. Try a different search or filter.
        </p>
      ) : (
        <div className="text-muted-foreground px-6 py-12 text-center text-sm">
          <p className="text-foreground mb-1 font-medium">No chats yet</p>
          <p>Use the pen icon above to start your first conversation.</p>
        </div>
      )}
    </nav>
  );
}
