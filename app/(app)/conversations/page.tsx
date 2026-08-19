"use client";

import * as React from "react";
import { MessageCircle, Plus, ShieldCheck, Zap, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NewConversationDialog } from "@/features/chat/components/new-conversation-dialog";

/**
 * Default state of the Conversation List screen when no
 * conversation is selected yet — the sidebar (always visible on desktop,
 * a Sheet drawer on mobile) is where the actual list lives; see
 * features/chat/components/app-sidebar.tsx.
 */
export default function ConversationsIndexPage() {
  const [isNewConversationOpen, setIsNewConversationOpen] = React.useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-2xl">
        <MessageCircle className="size-8" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">Welcome to WhisperBox</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Select a conversation from the list to start messaging, or create a new one.
        </p>
      </div>

      <Button onClick={() => setIsNewConversationOpen(true)} className="gap-2">
        <Plus className="size-4" aria-hidden="true" />
        Start a new conversation
      </Button>

      <NewConversationDialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen} />

      <ul className="text-muted-foreground mt-2 flex flex-col gap-1.5 text-xs">
        <li className="flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden="true" />
          End-to-end encrypted
        </li>
        <li className="flex items-center gap-1.5">
          <Zap className="size-3.5" aria-hidden="true" />
          Real-time delivery
        </li>
        <li className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Zero-knowledge architecture
        </li>
      </ul>
    </div>
  );
}
