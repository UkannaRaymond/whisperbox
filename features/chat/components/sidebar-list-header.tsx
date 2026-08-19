"use client";

import * as React from "react";
import { Plus, Search, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewConversationDialog } from "./new-conversation-dialog";
import type { NetworkStatus } from "@/features/offline/services/network-monitor";

export type FilterTab = "all" | "unread" | "pinned";

/**
 * The part of the "Messages" panel that should stay put while the
 * conversation list beneath it scrolls (WhatsApp-style: the search bar
 * and filter tabs never move). Split out of app-sidebar.tsx into its own
 * file specifically so this "static" piece and the "scrolls"
 * piece (conversation-list.tsx) are two physically separate components —
 * easier to reason about, and to keep static, than one function that
 * happens to render both.
 */
export function SidebarListHeader({
  searchInputRef,
  query,
  onQueryChange,
  tab,
  onTabChange,
  totalUnread,
  isOffline,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (value: string) => void;
  tab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  totalUnread: number;
  isOffline: boolean;
}) {
  const [isNewConversationOpen, setIsNewConversationOpen] = React.useState(false);

  return (
    <div>
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
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search conversations"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="px-3 pb-2">
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as FilterTab)}>
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

      {isOffline && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          <WifiOff className="size-3.5" aria-hidden="true" />
          Offline — showing cached conversations
        </div>
      )}
    </div>
  );
}

export type { NetworkStatus };
