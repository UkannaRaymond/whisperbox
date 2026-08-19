"use client";

import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, Lock, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDecryptedText } from "../hooks/use-decrypted-text";
import type { TimelineEntry } from "@/features/offline/types/offline.types";

/**
 * Chat Bubble (10-FRONTEND.md § UI Components: "Chat Bubble").
 *
 * Decryption itself lives in `useDecryptedText`
 * (features/chat/hooks/use-decrypted-text.ts) — shared with the
 * conversation list's last-message previews
 * (features/chat/components/conversation-card.tsx) so both decrypt the
 * same way. `wrappedKeyForMe` is legitimately absent in two cases, both
 * rendered via the locked state below: this device hasn't unlocked its
 * identity yet, or the sender's client hadn't resolved a device key for
 * this user at send time (e.g. they'd never opened the app on any
 * device) — see features/chat/utils/resolve-recipient-keys.ts.
 */
export function ChatBubble({
  entry,
  isOwnMessage,
  wrappedKeyForMe,
}: {
  entry: TimelineEntry;
  isOwnMessage: boolean;
  /** This recipient's wrapped copy of the message's AES key, if one was resolved server-side. */
  wrappedKeyForMe?: string;
}) {
  const isPending = entry.kind === "pending";
  const encryptedContent = isPending
    ? entry.operation.payload.encryptedContent
    : entry.message.encryptedContent;
  const nonce = isPending ? entry.operation.payload.nonce : entry.message.nonce;
  const createdAt = isPending ? entry.operation.createdAt : entry.message.createdAt;

  const decryption = useDecryptedText({
    encryptedContent,
    nonce,
    wrappedKeyForMe,
    // Our own just-composed, not-yet-sent message — we already have the
    // plaintext in memory at compose time; no need to re-decrypt what we
    // just encrypted a moment ago. Rendered as a placeholder below instead.
    skip: isPending,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <BubbleBody isPending={isPending} decryption={decryption} />

        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px]",
            isOwnMessage ? "justify-end" : "justify-start",
          )}
        >
          <time className="opacity-70" dateTime={createdAt}>
            {new Date(createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          {isOwnMessage && <DeliveryStatus entry={entry} />}
        </div>
      </div>
    </motion.div>
  );
}

function BubbleBody({
  isPending,
  decryption,
}: {
  isPending: boolean;
  decryption: ReturnType<typeof useDecryptedText>;
}) {
  if (isPending) {
    return <p className="italic opacity-80">Sending…</p>;
  }

  if (decryption.status === "decrypted") {
    return <p className="break-words whitespace-pre-wrap">{decryption.plaintext}</p>;
  }

  if (decryption.status === "error") {
    return (
      <p className="flex items-center gap-1.5 opacity-80">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        Couldn&apos;t decrypt this message
      </p>
    );
  }

  if (decryption.status === "decrypting") {
    return <p className="opacity-60">Decrypting…</p>;
  }

  return (
    <p className="flex items-center gap-1.5 opacity-80">
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      Unlock your device to view
    </p>
  );
}

function DeliveryStatus({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "pending") {
    if (entry.operation.state === "FAILED") {
      return <TriangleAlert className="size-3.5" aria-label="Failed to send" />;
    }
    return <Clock className="size-3.5" aria-label="Sending" />;
  }

  const status = entry.message.status;

  if (status === "READ") {
    return <CheckCheck className="size-3.5 text-emerald-400" aria-label="Read" />;
  }
  if (status === "DELIVERED") {
    // `text-primary-foreground/70` — a single-level color-alpha modifier,
    // not a separate `opacity-*` utility stacked on top of the row's own
    // (now removed — see the wrapping <div> above) opacity. Two nested
    // opacities were compounding multiplicatively (0.7 × 0.6 ≈ 0.42),
    // which is why these ticks were reported as invisible: this theme's
    // dark-mode `--primary-foreground` is near-black (#0b0d14) on a
    // medium-purple `--primary` (#8b7bf0) bubble, and near-black at 42%
    // opacity on a medium-light purple washes out to almost nothing.
    // `primary-foreground` is specifically the color chosen for contrast
    // against `primary` in both themes, so deriving from it (rather than
    // a hardcoded gray) keeps this correct in light mode too.
    return <CheckCheck className="size-3.5 text-primary-foreground/70" aria-label="Delivered" />;
  }
  return <Check className="size-3.5 text-primary-foreground/70" aria-label="Sent" />;
}
