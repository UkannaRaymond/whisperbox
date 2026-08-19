"use client";

import { Users } from "lucide-react";

import { avatarColorFor, initialsFor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresence } from "../hooks/use-presence";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/**
 * Chat window header. Previously always showed generic "Direct message" /
 * "Offline" for every DIRECT conversation — `otherUserId` was never
 * actually passed in from the one call site
 * (app/(app)/conversations/[id]/page.tsx), and even if it had been,
 * there was nowhere to get the other person's NAME from. Both are now
 * resolved server-side onto the conversation itself
 * (`conversation.otherMember`, services/mappers.ts#toConversationResponse).
 */
export function ConversationHeader({ conversation }: { conversation: LocalConversation }) {
  const { isOnline } = usePresence();
  const otherUserId = conversation.otherMember?.userId;
  const online = otherUserId ? isOnline(otherUserId) : false;

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

  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <Avatar className="size-9">
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
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        <p className="text-muted-foreground text-xs">
          {conversation.type === "GROUP" ? "Group" : online ? "Online" : "Offline"}
        </p>
      </div>
    </header>
  );
}
