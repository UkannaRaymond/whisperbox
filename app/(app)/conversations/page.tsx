"use client";

import * as React from "react";
import { Lock, Plus } from "lucide-react";

import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { NewConversationDialog } from "@/features/chat/components/new-conversation-dialog";

/**
 * Default state of the Conversation List screen when no
 * conversation is selected yet — on desktop this fills the space next to the
 * chat list; on phones the list itself is the screen, so this is never shown
 * (see app/(app)/layout.tsx).
 */
export default function ConversationsIndexPage() {
  const [isNewConversationOpen, setIsNewConversationOpen] = React.useState(false);

  return (
    <div className="bg-panel border-primary relative flex flex-1 flex-col items-center justify-center gap-6 border-b-[6px] px-8 text-center">
      <LogoMark className="size-20" />

      <div className="space-y-2">
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">WhisperBox on the web</h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-[15px] leading-6">
          Pick a chat from the list to read it, or start a new one. Everything you send is encrypted
          on this device first.
        </p>
      </div>

      <Button size="lg" onClick={() => setIsNewConversationOpen(true)}>
        <Plus aria-hidden="true" />
        New chat
      </Button>

      <NewConversationDialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen} />

      <p className="text-muted-foreground absolute bottom-10 flex items-center gap-1.5 text-[13px]">
        <Lock className="size-3.5" aria-hidden="true" />
        Your messages are end-to-end encrypted
      </p>
    </div>
  );
}
