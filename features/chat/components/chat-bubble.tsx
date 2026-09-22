"use client";

import { Check, CheckCheck, Clock, Lock, TriangleAlert } from "lucide-react";

import { useDecryptedText } from "../hooks/use-decrypted-text";
import { useMessageAttachments } from "../hooks/use-message-attachments";
import { AttachmentPreview } from "./attachment-preview";
import { BubbleFrame, BubbleSpacer } from "./bubble-frame";
import type { TimelineEntry } from "@/features/offline/types/offline.types";

/**
 * Chat Bubble .
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
  showTail = false,
}: {
  entry: TimelineEntry;
  isOwnMessage: boolean;
  /** This recipient's wrapped copy of the message's AES key, if one was resolved server-side. */
  wrappedKeyForMe?: string;
  /** Draw the bubble tail — set on the first bubble of a run from the same sender. */
  showTail?: boolean;
}) {
  const isPending = entry.kind === "pending";
  const encryptedContent = isPending
    ? entry.operation.payload.encryptedContent
    : entry.message.encryptedContent;
  const nonce = isPending ? entry.operation.payload.nonce : entry.message.nonce;
  const createdAt = isPending ? entry.operation.createdAt : entry.message.createdAt;
  const messageType = isPending ? entry.operation.payload.type : entry.message.type;
  const messageId = isPending ? undefined : entry.message.id;

  const attachmentsQuery = useMessageAttachments(
    messageId ?? "",
    Boolean(messageId) && messageType !== "TEXT",
  );

  const decryption = useDecryptedText({
    encryptedContent,
    nonce,
    wrappedKeyForMe,
    // Our own just-composed, not-yet-sent message — we already have the
    // plaintext in memory at compose time; no need to re-decrypt what we
    // just encrypted a moment ago. Rendered as a placeholder below instead.
    skip: isPending,
  });

  const attachments = !isPending ? (attachmentsQuery.data ?? []) : [];
  const hasCaption =
    decryption.status !== "decrypted" || decryption.plaintext.length > 0 || isPending;
  // Text bubbles float the timestamp in the corner; anything with a file in it puts it on its own row.
  const metaInline = attachments.length > 0 || !hasCaption;

  return (
    <BubbleFrame
      own={isOwnMessage}
      tail={showTail}
      metaInline={metaInline}
      meta={
        <>
          <time dateTime={createdAt}>
            {new Date(createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          {isOwnMessage && <DeliveryStatus entry={entry} />}
        </>
      }
    >
      <BubbleBody
        isPending={isPending}
        decryption={decryption}
        own={isOwnMessage}
        spacer={!metaInline}
      />

      {attachments.length > 0 && (
        <div className={hasCaption ? "mt-2 flex flex-col gap-2" : "flex flex-col gap-2"}>
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              wrappedKeyForMe={wrappedKeyForMe}
            />
          ))}
        </div>
      )}
    </BubbleFrame>
  );
}

function BubbleBody({
  isPending,
  decryption,
  own,
  spacer,
}: {
  isPending: boolean;
  decryption: ReturnType<typeof useDecryptedText>;
  own: boolean;
  spacer: boolean;
}) {
  const end = spacer ? <BubbleSpacer own={own} /> : null;

  if (isPending) {
    return (
      <p className="italic opacity-70">
        Sending…
        {end}
      </p>
    );
  }

  if (decryption.status === "decrypted") {
    if (!decryption.plaintext) return null;
    return (
      <p className="wrap-break-word whitespace-pre-wrap">
        {decryption.plaintext}
        {end}
      </p>
    );
  }

  if (decryption.status === "error") {
    return (
      <p className="flex items-center gap-1.5 opacity-80">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Couldn&apos;t decrypt this message
          {end}
        </span>
      </p>
    );
  }

  if (decryption.status === "decrypting") {
    return (
      <p className="opacity-60">
        Decrypting…
        {end}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 opacity-80">
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Unlock your device to view
        {end}
      </span>
    </p>
  );
}

function DeliveryStatus({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "pending") {
    if (entry.operation.state === "FAILED") {
      return <TriangleAlert className="text-destructive size-4" aria-label="Failed to send" />;
    }
    return <Clock className="size-3.5" aria-label="Sending" />;
  }

  const status = entry.message.status;

  if (status === "READ") {
    return <CheckCheck className="text-tick-read size-4" aria-label="Read" />;
  }
  if (status === "DELIVERED") {
    return <CheckCheck className="size-4" aria-label="Delivered" />;
  }
  return <Check className="size-4" aria-label="Sent" />;
}
