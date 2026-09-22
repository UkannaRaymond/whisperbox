"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Pin, Users } from "lucide-react";

import { cn, avatarColorFor, initialsFor, formatConversationTimestamp } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresence } from "../hooks/use-presence";
import { usePinConversation } from "../hooks/use-pin-conversation";
import { LastMessagePreview } from "./last-message-preview";
import type { LocalConversation } from "@/features/offline/types/offline.types";

/**
 * Conversation Card (10-FRONTEND.md § UI Components: "Conversation
 * Card"): a real contact name/avatar for DIRECT conversations (via
 * `conversation.otherMember`), a decrypted last-message preview, an
 * unread-count badge, a pin indicator, and a relative timestamp.
 * Pinning is in the chevron menu that appears on hover / keyboard focus.
 */
export function ConversationCard({
  conversation,
  isActive,
}: {
  conversation: LocalConversation;
  isActive: boolean;
}) {
  const { isOnline } = usePresence();
  const pinMutation = usePinConversation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const otherUserId = conversation.otherMember?.userId;
  const online = otherUserId ? isOnline(otherUserId) : false;
  const hasUnread = conversation.unreadCount > 0;

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
  const timestamp = conversation.lastMessage
    ? formatConversationTimestamp(conversation.lastMessage.createdAt)
    : formatConversationTimestamp(conversation.updatedAt);

  return (
    <div
      className={cn(
        "group relative transition-colors",
        // Inset divider that starts after the avatar, like a phone chat list.
        "after:bg-border/70 after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px",
        isActive ? "bg-accent" : "hover:bg-accent/60",
      )}
    >
      <Link
        href={`/conversations/${conversation.id}`}
        aria-current={isActive ? "page" : undefined}
        className="flex h-[72px] items-center gap-3 px-3 outline-offset-[-2px]"
      >
        <div className="relative shrink-0">
          <Avatar className="size-12">
            <AvatarImage src={avatarSrc ?? undefined} alt="" />
            <AvatarFallback
              style={{ backgroundColor: avatarColorFor(avatarColorSeed), color: "#0b0d14" }}
              className="text-base"
            >
              {conversation.type === "GROUP" ? (
                <Users className="size-5" aria-hidden="true" />
              ) : (
                initialsFor(title)
              )}
            </AvatarFallback>
          </Avatar>
          {conversation.type === "DIRECT" && online && (
            <span
              className="bg-primary border-background absolute right-0 bottom-0 size-3.5 rounded-full border-2"
              role="img"
              aria-label="Online"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-[16px] leading-5",
                hasUnread ? "font-semibold" : "font-medium",
              )}
            >
              {title}
            </p>
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                hasUnread ? "text-primary font-medium" : "text-muted-foreground",
              )}
            >
              {timestamp}
            </span>
          </div>

          <div className="mt-1 flex h-5.5 items-center gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-[14px] leading-5",
                hasUnread ? "text-foreground/85" : "text-muted-foreground",
              )}
            >
              <LastMessagePreview lastMessage={conversation.lastMessage} />
            </p>

            {/* Pin + unread badge; swapped for the menu chevron on hover/focus. */}
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5",
                menuOpen ? "invisible" : "group-focus-within:invisible group-hover:invisible",
              )}
            >
              {conversation.pinned && (
                <Pin
                  className="text-muted-foreground size-4 shrink-0 rotate-45"
                  aria-label="Pinned"
                />
              )}
              {hasUnread && (
                <span
                  className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] leading-none font-semibold tabular-nums"
                  aria-label={`${conversation.unreadCount} unread`}
                >
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "text-muted-foreground hover:text-foreground absolute right-3 bottom-3.5 flex size-6 items-center justify-center rounded-full",
              menuOpen ? "visible" : "invisible group-focus-within:visible group-hover:visible",
            )}
            aria-label="Chat options"
          >
            <ChevronDown className="size-5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              pinMutation.mutate({ conversationId: conversation.id, pinned: !conversation.pinned })
            }
          >
            <Pin className="size-4" aria-hidden="true" />
            {conversation.pinned ? "Unpin chat" : "Pin chat"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
