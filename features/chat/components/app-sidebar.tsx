"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useConversations } from "../hooks/use-conversations";
import { IconRail } from "./icon-rail";
import { SidebarPanel } from "./sidebar-panel";

/**
 * Sidebar + Top Navigation (10-FRONTEND.md § UI Components).
 *
 * Just composes IconRail (static icon column) and SidebarPanel (the
 * "Messages" search/tabs/list panel) — the actual static-header /
 * scrollable-list split lives inside SidebarPanel now (see its doc
 * comment, plus sidebar-list-header.tsx / conversation-list.tsx), split
 * out on request rather than being one large function that mixes both
 * concerns. Responsive: both columns collapse into a Sheet-based drawer
 * on mobile.
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
      <div className="hidden min-h-0 shrink-0 md:flex">
        <IconRail unreadCount={totalUnread} onSearchClick={focusSearch} />
        <aside className="bg-sidebar min-h-0 w-80 shrink-0 border-r">
          <SidebarPanel searchInputRef={searchInputRef} />
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
            <SidebarPanel searchInputRef={searchInputRef} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">WhisperBox</span>
      </div>
    </>
  );
}
