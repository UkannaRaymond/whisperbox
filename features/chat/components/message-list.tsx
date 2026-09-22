"use client";

import * as React from "react";
import { ChevronDown, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatBubble } from "./chat-bubble";
import { buildTimelineItems, entryMeta } from "../utils/timeline";
import type { TimelineEntry } from "@/features/offline/types/offline.types";

/** How close to the bottom (px) still counts as "reading the latest messages". */
const STICK_TO_BOTTOM_THRESHOLD = 96;

/**
 * The scrollable message area of the chat window — deliberately the ONLY
 * scrolling element in the window (see conversations/[id]/page.tsx's
 * grid layout). Split out into its own file, alongside the header
 * (already its own component, conversation-header.tsx) and the composer
 * (message-composer.tsx), so "the part that stays put" (header, composer)
 * and "the part that scrolls" (this) are physically separate components —
 * matching the same static-header/scrollable-list split used in the
 * sidebar (sidebar-list-header.tsx / conversation-list.tsx).
 *
 * The wallpaper lives on a non-scrolling wrapper and the messages scroll
 * inside it, so the doodle pattern stays put behind the bubbles.
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
  const stickToBottom = React.useRef(true);
  const [showJump, setShowJump] = React.useState(false);

  const items = React.useMemo(
    () => buildTimelineItems(timeline ?? [], currentUserId),
    [timeline, currentUserId],
  );

  const lastEntry = timeline && timeline.length > 0 ? timeline[timeline.length - 1] : undefined;
  const lastIsOwn = lastEntry ? entryMeta(lastEntry, currentUserId).isOwn : false;
  const count = timeline?.length ?? 0;

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < STICK_TO_BOTTOM_THRESHOLD;
    stickToBottom.current = nearBottom;
    setShowJump((prev) => (prev === !nearBottom ? prev : !nearBottom));
  }

  React.useEffect(() => {
    if (stickToBottom.current || lastIsOwn) {
      stickToBottom.current = true;
      scrollToBottom();
    }
  }, [count, lastIsOwn, isLoading]);

  return (
    <div className="chat-wallpaper min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto overscroll-contain px-3 py-3 sm:px-[6%] lg:px-[8%]"
      >
        <EncryptionNotice />

        {isLoading ? (
          <div className="mt-4 space-y-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className={cn(
                  "bg-bubble-in/80 h-10 rounded-lg",
                  i % 2 === 0 ? "w-2/5" : "ml-auto w-1/2",
                )}
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <ol className="mt-2 flex flex-col">
            {items.map((item) =>
              item.type === "day" ? (
                <li key={item.key} className="my-3 flex justify-center">
                  <span className="bg-bubble-in text-bubble-meta rounded-lg px-3 py-1 text-xs font-medium shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
                    {item.label}
                  </span>
                </li>
              ) : (
                <li
                  key={item.key}
                  className={cn(
                    "flex",
                    item.isOwn ? "justify-end" : "justify-start",
                    item.startsRun ? "mt-2 first:mt-0" : "mt-0.5",
                    // Room for the tail so it doesn't touch the edge of the screen.
                    item.isOwn ? "pr-2" : "pl-2",
                  )}
                >
                  <ChatBubble
                    entry={item.entry}
                    isOwnMessage={item.isOwn}
                    showTail={item.startsRun}
                    wrappedKeyForMe={
                      item.entry.kind === "message"
                        ? (item.entry.message.encryptedKeyForMe ?? undefined)
                        : undefined
                    }
                  />
                </li>
              ),
            )}
          </ol>
        ) : (
          <p className="bg-bubble-in text-bubble-meta mx-auto mt-6 w-fit rounded-lg px-4 py-2 text-center text-sm shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
            No messages yet. Say hello!
          </p>
        )}
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => {
            stickToBottom.current = true;
            scrollToBottom("smooth");
          }}
          className="bg-bubble-in text-bubble-meta hover:text-foreground absolute right-4 bottom-3 flex size-10 items-center justify-center rounded-full shadow-md transition-colors"
          aria-label="Scroll to latest message"
        >
          <ChevronDown className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function EncryptionNotice() {
  return (
    <p className="bg-notice text-notice-foreground mx-auto flex w-fit max-w-md items-start gap-2 rounded-lg px-3 py-2 text-center text-[12.5px] leading-[18px] shadow-[0_1px_0.5px_rgb(11_20_26/0.1)]">
      <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
      <span>
        Messages in this chat are end-to-end encrypted. Only the people in it can read them.
      </span>
    </p>
  );
}
