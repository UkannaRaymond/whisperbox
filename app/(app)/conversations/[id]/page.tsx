"use client";

import * as React from "react";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { useConversation } from "@/features/chat/hooks/use-conversation";
import { useConversationTimeline } from "@/features/chat/hooks/use-conversation-timeline";
import { useTyping } from "@/features/chat/hooks/use-typing";
import { useMarkRead } from "@/features/chat/hooks/use-mark-read";
import type { TimelineEntry } from "@/features/offline/types/offline.types";
import { ConversationHeader } from "@/features/chat/components/conversation-header";
import { MessageList } from "@/features/chat/components/message-list";
import { TypingIndicator } from "@/features/chat/components/typing-indicator";
import { MessageComposer } from "@/features/chat/components/message-composer";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Chat Window (10-FRONTEND.md § Core Screens: "Chat Window").
 *
 * Grid rows `[auto, minmax(0,1fr), auto]`: header stays put, MessageList
 * (the middle row) is the only thing that scrolls, composer stays put —
 * WhatsApp-style. A `1fr` GRID track has an implicit minimum size of 0
 * (unlike a flex item, which needs an explicit `min-h-0` override), so
 * this doesn't depend on threading `min-h-0` through every ancestor the
 * way the equivalent flex-column layout did.
 */
export default function ChatWindowPage({ params }: PageProps) {
  const { id: conversationId } = use(params);

  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;

  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);
  const { data: timeline, isLoading: isLoadingTimeline } = useConversationTimeline(conversationId);
  const { typingUserIds } = useTyping(conversationId);

  // Everything up to and including the newest actually-persisted message
  // (excludes optimistic "pending" entries, which don't have a server id
  // yet — see features/offline/types/offline.types.ts's TimelineEntry).
  //
  // Uses `.find()` with an explicit type predicate rather than a manual
  // reverse `for` loop: with `noUncheckedIndexedAccess` on, indexing an
  // array (`timeline[i]`) types as `TimelineEntry | undefined`, and once
  // the loop variable itself is possibly-undefined, TS also stops
  // narrowing the `kind` discriminant cleanly on top of it. `.find()`'s
  // return type is `T | undefined` on its own terms (no indexing
  // involved), and the predicate narrows the array's element type
  // directly.
  const latestMessageId = React.useMemo(() => {
    if (!timeline) return null;
    const latest = [...timeline]
      .reverse()
      .find((entry): entry is Extract<TimelineEntry, { kind: "message" }> => entry.kind === "message");
    return latest?.message.id ?? null;
  }, [timeline]);

  useMarkRead(conversationId, latestMessageId);

  if (isLoadingConversation || !conversation) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
      <ConversationHeader conversation={conversation} />
      <MessageList timeline={timeline} isLoading={isLoadingTimeline} currentUserId={currentUserId} />
      <div>
        <TypingIndicator typingUserIds={typingUserIds} />
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
}
