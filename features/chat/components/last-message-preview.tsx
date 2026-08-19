"use client";

import { useDecryptedText } from "../hooks/use-decrypted-text";
import type { ConversationLastMessagePreviewDto } from "@/schemas/conversation.schema";

const NON_TEXT_LABELS: Record<string, string> = {
  IMAGE: "📷 Photo",
  VIDEO: "🎥 Video",
  AUDIO: "🎤 Voice message",
  FILE: "📎 File",
  LOCATION: "📍 Location",
  CONTACT: "👤 Contact",
  SYSTEM: "",
};

/**
 * A one-line, decrypted preview of a conversation's last message — the
 * "Are you still coming to the standu…" line under each contact name in
 * the conversation list. Reuses `useDecryptedText`
 * (features/chat/hooks/use-decrypted-text.ts), the same hook `ChatBubble`
 * uses, so this list-level preview and the full chat window never
 * disagree about whether a message can be decrypted right now.
 */
export function LastMessagePreview({
  lastMessage,
  senderPrefix,
}: {
  lastMessage: ConversationLastMessagePreviewDto | null;
  /** For GROUP conversations, e.g. "Daniel: " — omitted for DIRECT conversations, where the sender is implied by the conversation itself. */
  senderPrefix?: string;
}) {
  const nonTextLabel = lastMessage ? NON_TEXT_LABELS[lastMessage.type] : undefined;

  const decryption = useDecryptedText({
    encryptedContent: lastMessage?.encryptedContent ?? "",
    nonce: lastMessage?.nonce ?? "",
    wrappedKeyForMe: lastMessage?.encryptedKeyForMe,
    skip: !lastMessage || lastMessage.type !== "TEXT",
  });

  if (!lastMessage) {
    return <span className="text-muted-foreground/70 italic">No messages yet</span>;
  }

  if (nonTextLabel !== undefined && lastMessage.type !== "TEXT") {
    return (
      <span>
        {senderPrefix}
        {nonTextLabel}
      </span>
    );
  }

  if (decryption.status === "decrypted") {
    return (
      <span>
        {senderPrefix}
        {decryption.plaintext}
      </span>
    );
  }

  if (decryption.status === "error") {
    return <span className="italic">Couldn&apos;t decrypt this message</span>;
  }

  if (decryption.status === "decrypting") {
    return <span className="italic opacity-70">Decrypting…</span>;
  }

  return <span className="italic opacity-70">🔒 Encrypted message</span>;
}
