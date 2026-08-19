"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ChatBubble } from "./chat-bubble";
import type { TimelineEntry } from "@/features/offline/types/offline.types";

/**
 * The scrollable message area of the chat window — deliberately the ONLY
 * scrolling element in the window (see conversations/[id]/page.tsx's
 * grid layout). Split out into its own file, alongside the header
 * (already its own component, conversation-header.tsx) and the composer
 * (message-composer.tsx), so "the part that stays put" (header, composer)
 * and "the part that scrolls" (this) are physically separate components —
 * matching the same static-header/scrollable-list split used in the
 * sidebar (sidebar-list-header.tsx / conversation-list.tsx).
 */
export function MessageList({
  timeline,
  isLoading,
  currentUserId,
}: {
  timeline: TimelineEntry[] | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
  }, [timeline?.length]);

  return (
    <div ref={scrollRef} className="min-h-0 space-y-2 overflow-y-auto p-4">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={i % 2 === 0 ? "ml-auto h-10 w-2/5" : "h-10 w-1/2"} />
          ))}
        </div>
      ) : timeline && timeline.length > 0 ? (
        timeline.map((entry) => (
          <ChatBubble
            key={entry.kind === "message" ? entry.message.id : entry.operation.id}
            entry={entry}
            isOwnMessage={entry.kind === "pending" ? true : entry.message.senderId === currentUserId}
            wrappedKeyForMe={
              entry.kind === "message" ? (entry.message.encryptedKeyForMe ?? undefined) : undefined
            }
          />
        ))
      ) : (
        <p className="text-muted-foreground py-12 text-center text-sm">No messages yet. Say hello!</p>
      )}
    </div>
  );
}
