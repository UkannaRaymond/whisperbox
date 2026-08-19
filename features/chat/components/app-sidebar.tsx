"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Plus, Search, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useConversations } from "../hooks/use-conversations";
import { ConversationCard } from "./conversation-card";
import { NewConversationDialog } from "./new-conversation-dialog";
import { IconRail } from "./icon-rail";
import { useNetworkStatus } from "@/features/offline/hooks/use-network-status";
import type { LocalConversation } from "@/features/offline/types/offline.types";

type FilterTab = "all" | "unread" | "pinned";

/**
 * Sidebar + Top Navigation (10-FRONTEND.md § UI Components), rebuilt to
 * match the reference design: an icon rail (`IconRail`) plus a "Messages"
 * panel with search, All/Unread/Pinned tabs, and a pinned section above
 * the regular list — none of which existed before (the previous version
 * was a single flat list with a "new conversation" button and nothing
 * else). Responsive: both columns collapse into a Sheet-based drawer on
 * mobile, matching the previous responsive behavior.
 */
export function AppSidebar() {
  const { data: conversations } = useConversations();
  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  function focusSearch() {
    searchInputRef.current?.focus();
  }

  return (
    <>
      <div className="hidden shrink-0 md:flex">
        <IconRail unreadCount={totalUnread} onSearchClick={focusSearch} />
        <aside className="bg-sidebar flex min-h-0 w-80 shrink-0 flex-col border-r">
          <SidebarContent searchInputRef={searchInputRef} />
        </aside>
      </div>

      <div className="flex items-center gap-2 border-b p-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open conversations">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Conversations</SheetTitle>
            </SheetHeader>
            <SidebarContent searchInputRef={searchInputRef} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">WhisperBox</span>
      </div>
    </>
  );
}

function SidebarContent({
  searchInputRef,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { data: conversations, isLoading } = useConversations();
  const pathname = usePathname();
  const { status } = useNetworkStatus();
  const [isNewConversationOpen, setIsNewConversationOpen] = React.useState(false);
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between p-3 pb-2">
        <div>
          <h2 className="text-base font-semibold">Messages</h2>
          <p className="text-muted-foreground text-xs">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
          </p>
        </div>
        <Button
          size="icon"
          className="size-8 rounded-lg"
          aria-label="New conversation"
          onClick={() => setIsNewConversationOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <NewConversationDialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen} />

      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="px-3 pb-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {totalUnread > 0 && <span className="text-muted-foreground ml-1">{totalUnread}</span>}
            </TabsTrigger>
            <TabsTrigger value="pinned" className="text-xs">
              Pinned
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {status === "offline" && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          <WifiOff className="size-3.5" aria-hidden="true" />
          Offline — showing cached conversations
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" aria-label="Conversations">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        ) : filtered.length > 0 ? (
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
                    isActive={pathname === `/conversations/${conversation.id}`}
                  />
                ))}
              </>
            )}
            {unpinned.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isActive={pathname === `/conversations/${conversation.id}`}
              />
            ))}
          </>
        ) : conversations && conversations.length > 0 ? (
          <p className="text-muted-foreground p-3 text-sm">No conversations match.</p>
        ) : (
          <p className="text-muted-foreground p-3 text-sm">No conversations yet.</p>
        )}
      </nav>
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
