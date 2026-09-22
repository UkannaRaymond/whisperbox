"use client";

import * as React from "react";
import { use } from "react";

import { useSession } from "@/lib/auth-client";
import { useConversation } from "@/features/chat/hooks/use-conversation";
import { useConversationTimeline } from "@/features/chat/hooks/use-conversation-timeline";
import { useTyping } from "@/features/chat/hooks/use-typing";
import { useMarkRead } from "@/features/chat/hooks/use-mark-read";
import type { TimelineEntry } from "@/features/offline/types/offline.types";
import {
  ConversationHeader,
  ConversationHeaderSkeleton,
} from "@/features/chat/components/conversation-header";
import { MessageList } from "@/features/chat/components/message-list";
import { MessageComposer } from "@/features/chat/components/message-composer";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Chat Window
 */
export default function ChatWindowPage({ params }: PageProps) {
  const { id: conversationId } = use(params);

  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;

  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);
  const { data: timeline, isLoading: isLoadingTimeline } = useConversationTimeline(conversationId);
  const { typingUserIds } = useTyping(conversationId);

  const latestMessageId = React.useMemo(() => {
    if (!timeline) return null;
    const latest = [...timeline]
      .reverse()
      .find(
        (entry): entry is Extract<TimelineEntry, { kind: "message" }> => entry.kind === "message",
      );
    return latest?.message.id ?? null;
  }, [timeline]);

  useMarkRead(conversationId, latestMessageId);

  if (isLoadingConversation || !conversation) {
    return (
      <div className="flex flex-1 flex-col">
        <ConversationHeaderSkeleton />
        <div className="chat-wallpaper flex-1" />
      </div>
    );
  }

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
      <ConversationHeader conversation={conversation} typingUserIds={typingUserIds} />
      <MessageList
        timeline={timeline}
        isLoading={isLoadingTimeline}
        currentUserId={currentUserId}
      />
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
