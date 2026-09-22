"use client";

import * as React from "react";
import { Loader2, Paperclip, SendHorizonal, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useNetworkStatus } from "@/features/offline/hooks/use-network-status";
import { useComposerStore } from "../store/composer-store";
import { useTyping } from "../hooks/use-typing";
import { useSendMessage } from "../hooks/use-send-message";
import { useSendAttachment } from "../hooks/use-send-attachment";

/** Files larger than this are rejected client-side — matches createAttachmentSchema's server-side 500MB cap, checked early so the user isn't left waiting through an encrypt+upload attempt that was always going to be rejected. */
const MAX_ATTACHMENT_BYTES = 500 * 1024 * 1024;

/** Tallest the input grows (px) before it scrolls. */
const MAX_INPUT_HEIGHT = 128;

/**
 * Message Composer (10-FRONTEND.md § UI Components: "Message Composer").
 */
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const draft = useComposerStore((state) => state.drafts[conversationId] ?? "");
  const setDraft = useComposerStore((state) => state.setDraft);
  const clearDraft = useComposerStore((state) => state.clearDraft);

  const { notifyTyping, notifyStoppedTyping } = useTyping(conversationId);
  const sendMessage = useSendMessage();
  const sendAttachment = useSendAttachment();
  const { status: networkStatus } = useNetworkStatus();
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Grow with the text up to MAX_INPUT_HEIGHT (works in every browser, unlike `field-sizing`).
  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [draft]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;

    setError(null);
    notifyStoppedTyping();
    // Clear the textarea immediately, before the send even starts —

    clearDraft(conversationId);

    try {
      await sendMessage.mutateAsync({ conversationId, plaintext: text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setDraft(conversationId, text);
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("That file is larger than the 500MB limit.");
      return;
    }

    setError(null);
    try {
      await sendAttachment.mutateAsync({ conversationId, file });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send attachment");
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSend();
    }
  }

  const canSend = draft.trim().length > 0 && !sendMessage.isPending;

  return (
    <div className="bg-panel border-t pb-[env(safe-area-inset-bottom)]">
      {networkStatus === "offline" && (
        <p className="text-notice-foreground bg-notice flex items-center justify-center gap-1.5 px-3 py-1.5 text-center text-xs">
          <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
          You&apos;re offline. Messages will send when you reconnect.
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive px-4 pt-2 text-sm font-medium">
          {error}
        </p>
      )}
      <div className="flex items-end gap-1.5 px-2 py-2 sm:gap-2 sm:px-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => void handleFileSelected(event)}
          aria-hidden="true"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sendAttachment.isPending}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50"
          aria-label="Attach a file"
        >
          {sendAttachment.isPending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Paperclip className="size-5" aria-hidden="true" />
          )}
        </button>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            setDraft(conversationId, event.target.value);
            notifyTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className="bg-background placeholder:text-muted-foreground focus-visible:ring-ring/40 min-h-11 flex-1 resize-none rounded-3xl px-4 py-[11px] text-base leading-[22px] outline-none focus-visible:ring-2 md:text-[15px]"
          style={{ maxHeight: MAX_INPUT_HEIGHT }}
          aria-label="Message"
        />

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
            canSend
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground bg-transparent",
          )}
          aria-label="Send message"
        >
          {sendMessage.isPending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizonal className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
