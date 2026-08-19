"use client";

import * as React from "react";
import { SendHorizonal, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useComposerStore } from "../store/composer-store";
import { useTyping } from "../hooks/use-typing";
import { useSendMessage } from "../hooks/use-send-message";

/**
 * Message Composer (10-FRONTEND.md § UI Components: "Message Composer").
 *
 * Sending will currently surface the named blocker in
 * resolve-recipient-keys.ts (no members-list/public-key endpoint exists
 * yet) as a visible error rather than silently failing or pretending to
 * succeed.
 */
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const draft = useComposerStore((state) => state.drafts[conversationId] ?? "");
  const setDraft = useComposerStore((state) => state.setDraft);
  const clearDraft = useComposerStore((state) => state.clearDraft);

  const { notifyTyping, notifyStoppedTyping } = useTyping(conversationId);
  const sendMessage = useSendMessage();
  const [error, setError] = React.useState<string | null>(null);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;

    setError(null);
    notifyStoppedTyping();
    // Clear the textarea immediately, before the send even starts —
    // WhatsApp-style optimistic UX. Previously this only happened after
    // `mutateAsync` resolved, so the typed text sat in the box for the
    // entire round-trip (encryption + socket ack, or the offline-queue
    // fallback), which reads as "my message isn't sending" even when it
    // actually is. If the send fails, the text is restored below so
    // nothing typed is lost.
    clearDraft(conversationId);

    try {
      await sendMessage.mutateAsync({ conversationId, plaintext: text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setDraft(conversationId, text);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="border-t p-3">
      {error && (
        <p role="alert" className="text-destructive mb-2 text-sm font-medium">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(conversationId, event.target.value);
            notifyTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="max-h-40 min-h-10 resize-none"
          aria-label="Message"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sendMessage.isPending}
          aria-label="Send message"
        >
          {sendMessage.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizonal aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
