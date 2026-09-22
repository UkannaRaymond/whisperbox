"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useConversations } from "../hooks/use-conversations";
import { IconRail } from "./icon-rail";
import { SidebarPanel } from "./sidebar-panel";

/**
 * Sidebar (10-FRONTEND.md § UI Components).
 *
 * Desktop: IconRail + the chat-list panel, always visible beside the
 * conversation. Phones: no rail and no drawer — the chat list is its own
 * screen (shown on `/conversations` only), an open chat takes the whole
 * screen with a back button, and <MobileNav /> (rendered by the app layout)
 * provides navigation.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { data: conversations } = useConversations();
  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const isListRoute = pathname === "/conversations";

  return (
    <>
      <IconRail unreadCount={totalUnread} />
      <aside
        aria-label="Conversations"
        className={cn(
          "bg-sidebar min-h-0 min-w-0 flex-1 flex-col border-r md:w-[clamp(320px,30vw,420px)] md:flex-none",
          isListRoute ? "flex" : "hidden md:flex",
        )}
      >
        <SidebarPanel searchInputRef={searchInputRef} />
      </aside>
    </>
  );
}
