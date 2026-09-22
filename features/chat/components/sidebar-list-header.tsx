"use client";

import * as React from "react";
import { EllipsisVertical, Lock, LogOut, Search, SquarePen, Users, WifiOff, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/shared/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountActions } from "../hooks/use-account-actions";
import { NewConversationDialog } from "./new-conversation-dialog";
import { NewGroupDialog } from "./new-group-dialog";
import type { NetworkStatus } from "@/features/offline/services/network-monitor";

export type FilterTab = "all" | "unread" | "pinned";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "pinned", label: "Pinned" },
];

/**
 * The part of the chat-list panel that should stay put while the
 * conversation list beneath it scrolls (WhatsApp-style: the search bar
 * and filter chips never move). Split out of app-sidebar.tsx into its own
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
  const [isNewGroupOpen, setIsNewGroupOpen] = React.useState(false);
  const { lock, signOut } = useAccountActions();

  return (
    <div>
      <div className="flex h-15 items-center justify-between gap-2 pr-2 pl-4">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-7 md:hidden" />
          <h2 className="text-[22px] font-bold tracking-[-0.03em]">Chats</h2>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsNewConversationOpen(true)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors"
            aria-label="New chat"
          >
            <SquarePen className="size-5" aria-hidden="true" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent flex size-10 items-center justify-center rounded-full transition-colors"
                aria-label="More options"
              >
                <EllipsisVertical className="size-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsNewGroupOpen(true)}>
                <Users className="size-4" aria-hidden="true" />
                New group
              </DropdownMenuItem>
              {/* Phones have no icon rail, so account actions live here. */}
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem className="md:hidden" onClick={() => lock()}>
                <Lock className="size-4" aria-hidden="true" />
                Lock device
              </DropdownMenuItem>
              <DropdownMenuItem
                className="md:hidden"
                variant="destructive"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NewConversationDialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen} />
      <NewGroupDialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen} />

      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="bg-secondary h-10 rounded-full border-transparent pr-10 pl-10 shadow-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onQueryChange("");
                searchInputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-3 pb-2.5" role="group" aria-label="Filter chats">
        {TABS.map(({ value, label }) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onTabChange(value)}
              aria-pressed={active}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {label}
              {value === "unread" && totalUnread > 0 && (
                <span className="ml-1.5 tabular-nums">{totalUnread}</span>
              )}
            </button>
          );
        })}
      </div>

      {isOffline && (
        <div className="bg-notice text-notice-foreground flex items-center gap-1.5 px-4 py-1.5 text-xs">
          <WifiOff className="size-3.5" aria-hidden="true" />
          Offline — showing cached chats
        </div>
      )}
    </div>
  );
}

export type { NetworkStatus };
