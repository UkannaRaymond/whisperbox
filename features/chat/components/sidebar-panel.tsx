"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useConversations } from "../hooks/use-conversations";
import { useNetworkStatus } from "@/features/offline/hooks/use-network-status";
import { SidebarListHeader, type FilterTab } from "./sidebar-list-header";
import { ConversationList } from "./conversation-list";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/**
 * The "Messages" panel (search + tabs + list). Uses CSS Grid with rows
 * `[auto, minmax(0,1fr)]` rather than a flex column: a `1fr` GRID track
 * (unlike a flex item) already has an implicit minimum size of 0, so the
 * second row can shrink to fit the available space and hand off
 * scrolling to `<ConversationList>`'s own `overflow-y-auto` without
 * needing the `min-h-0` escape hatches flexbox requires for the same
 * result. `SidebarListHeader` (row 1, `auto`-sized) never moves;
 * `ConversationList` (row 2) is the only thing that scrolls.
 */
export function SidebarPanel({
  searchInputRef,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { data: conversations, isLoading } = useConversations();
  const pathname = usePathname();
  const { status } = useNetworkStatus();
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [query, setQuery] = React.useState("");

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  const filtered = React.useMemo(() => {
    if (!conversations) return [];
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (tab === "unread" && c.unreadCount === 0) return false;
      if (tab === "pinned" && !c.pinned) return false;
      if (q.length > 0 && !conversationMatches(c, q)) return false;
      return true;
    });
  }, [conversations, tab, query]);

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  const activeConversationId = pathname.startsWith("/conversations/")
    ? pathname.slice("/conversations/".length)
    : undefined;

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
      <SidebarListHeader
        searchInputRef={searchInputRef}
        query={query}
        onQueryChange={setQuery}
        tab={tab}
        onTabChange={setTab}
        totalUnread={totalUnread}
        isOffline={status === "offline"}
      />
      <ConversationList
        isLoading={isLoading}
        hasAnyConversations={Boolean(conversations && conversations.length > 0)}
        pinned={pinned}
        unpinned={unpinned}
        activeConversationId={activeConversationId}
      />
    </div>
  );
}

function conversationMatches(conversation: LocalConversation, query: string): boolean {
  const name =
    conversation.type === "GROUP"
      ? (conversation.name ?? "")
      : (conversation.otherMember?.displayName ?? conversation.otherMember?.username ?? "");
  return name.toLowerCase().includes(query);
}
