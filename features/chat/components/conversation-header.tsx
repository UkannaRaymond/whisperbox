"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

import { avatarColorFor, initialsFor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresence } from "../hooks/use-presence";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/** Shared top-bar frame so the loading skeleton and the real header line up exactly (and both keep the mobile back button). */
function HeaderFrame({ children }: { children: React.ReactNode }) {
  return (
    <header className="bg-panel flex h-15 items-center gap-1 border-b pr-3 pl-1.5 md:gap-3 md:px-4">
      <Link
        href="/conversations"
        aria-label="Back to chats"
        className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-full transition-colors md:hidden"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      {children}
    </header>
  );
}

export function ConversationHeaderSkeleton() {
  return (
    <HeaderFrame>
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="ml-2 space-y-2 md:ml-0">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    </HeaderFrame>
  );
}

/**
 * Chat window header. Previously always showed generic "Direct message" /
 * "Offline" for every DIRECT conversation — `otherUserId` was never
 * actually passed in from the one call site
 * (app/(app)/conversations/[id]/page.tsx), and even if it had been,
 * there was nowhere to get the other person's NAME from. Both are now
 * resolved server-side onto the conversation itself
 * (`conversation.otherMember`, services/mappers.ts#toConversationResponse).
 *
 * Typing state shows as the subtitle ("typing…") rather than a separate row above the composer.
 */
export function ConversationHeader({
  conversation,
  typingUserIds,
}: {
  conversation: LocalConversation;
  typingUserIds?: Set<string>;
}) {
  const { isOnline } = usePresence();
  const otherUserId = conversation.otherMember?.userId;
  const online = otherUserId ? isOnline(otherUserId) : false;
  const isTyping = (typingUserIds?.size ?? 0) > 0;

  const title =
    conversation.type === "GROUP"
      ? (conversation.name ?? "Untitled group")
      : (conversation.otherMember?.displayName ??
        conversation.otherMember?.username ??
        "Direct message");

  const avatarSrc =
    conversation.type === "GROUP" ? conversation.avatar : conversation.otherMember?.avatarUrl;
  const avatarColorSeed =
    conversation.type === "GROUP" ? conversation.id : (otherUserId ?? conversation.id);

  const subtitle = isTyping
    ? typingUserIds!.size === 1
      ? "typing…"
      : `${typingUserIds!.size} people typing…`
    : conversation.type === "GROUP"
      ? "Group"
      : online
        ? "Online"
        : "Offline";

  return (
    <HeaderFrame>
      <Avatar className="size-10">
        <AvatarImage src={avatarSrc ?? undefined} alt="" />
        <AvatarFallback
          style={{ backgroundColor: avatarColorFor(avatarColorSeed), color: "#0b0d14" }}
        >
          {conversation.type === "GROUP" ? (
            <Users className="size-4" aria-hidden="true" />
          ) : (
            initialsFor(title)
          )}
        </AvatarFallback>
      </Avatar>
      <div className="ml-2 min-w-0 md:ml-0">
        <h1 className="truncate text-[16px] leading-5 font-semibold">{title}</h1>
        <p
          aria-live="polite"
          className={
            isTyping || (online && conversation.type === "DIRECT")
              ? "text-primary truncate text-[13px] leading-4"
              : "text-muted-foreground truncate text-[13px] leading-4"
          }
        >
          {subtitle}
        </p>
      </div>
    </HeaderFrame>
  );
}
