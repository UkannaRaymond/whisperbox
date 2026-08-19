"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Pin, Users, MoreHorizontal } from "lucide-react";

import { cn, avatarColorFor, initialsFor, formatConversationTimestamp } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
 * Card"), rebuilt to match the reference screenshot: a real contact
 * name/avatar for DIRECT conversations (via `conversation.otherMember` —
 * previously every DIRECT conversation showed generic "Direct message" /
 * "Offline", because nothing ever resolved who the other person was),
 * a decrypted last-message preview, an unread-count badge, a pin
 * indicator, and a relative timestamp.
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
  const timestamp = conversation.lastMessage
    ? formatConversationTimestamp(conversation.lastMessage.createdAt)
    : formatConversationTimestamp(conversation.updatedAt);

  return (
    <div className="group relative">
      <Link href={`/conversations/${conversation.id}`}>
        <motion.div
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "flex items-start gap-3 rounded-lg px-3 py-2.5 pr-8 transition-colors",
            isActive ? "bg-accent" : "hover:bg-accent/50",
          )}
        >
          <div className="relative shrink-0">
            <Avatar>
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
            {conversation.type === "DIRECT" && (
              <span
                className={cn(
                  "border-background absolute right-0 bottom-0 size-2.5 rounded-full border-2",
                  online ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
                aria-label={online ? "Online" : "Offline"}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {conversation.pinned && (
                <Pin
                  className="text-muted-foreground size-3 shrink-0 fill-current"
                  aria-hidden="true"
                />
              )}
              <p
                className={cn(
                  "truncate text-sm",
                  conversation.unreadCount > 0 ? "font-semibold" : "font-medium",
                )}
              >
                {title}
              </p>
              <span className="text-muted-foreground ml-auto shrink-0 text-[11px]">
                {timestamp}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <p
                className={cn(
                  "text-muted-foreground min-w-0 flex-1 truncate text-xs",
                  conversation.unreadCount > 0 && "text-foreground/80",
                )}
              >
                <LastMessagePreview lastMessage={conversation.lastMessage} />
                {/* No sender-name prefix for GROUP conversations
                    ("Daniel: ...") yet — that needs the sender's display
                    name resolved server-side the same way `otherMember`
                    is for DIRECT conversations, and
                    ConversationLastMessagePreviewDto only carries
                    `senderId` right now. Showing a raw user id here would
                    be worse than omitting it. */}
              </p>
              {conversation.unreadCount > 0 && (
                <Badge className="h-4.5 min-w-4.5 shrink-0 justify-center rounded-full px-1.5 text-[10px]">
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </motion.div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-1 size-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Conversation options"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="size-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              pinMutation.mutate({ conversationId: conversation.id, pinned: !conversation.pinned });
            }}
          >
            <Pin className="size-4" aria-hidden="true" />
            {conversation.pinned ? "Unpin conversation" : "Pin conversation"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
