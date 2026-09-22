"use client";

import * as React from "react";
import { Download, File as FileIcon, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useIdentityStore } from "@/features/auth/store/identity-store";
import * as CryptoService from "@/features/encryption/services/crypto.service";
import { decryptAttachmentFile } from "../utils/attachment-crypto";
import type { AttachmentResponseDto, DownloadUrlResponseDto } from "@/schemas/attachment.schema";

/**
 * One attachment's download/preview control, rendered inside a chat
 * bubble whose message has one or more attachments
 * (`useMessageAttachments`). Decryption happens on demand — clicking
 * "Download" — rather than eagerly for every attachment in the timeline,
 * since a file can be up to 500MB and most won't be opened immediately.
 *
 * Needs the message's own wrapped content key (`wrappedKeyForMe`, same
 * one ChatBubble already threads into `useDecryptedText` for the message
 * text) to unwrap the attachment's file key — see
 * `attachment-crypto.ts`'s envelope design doc comment.
 */
export function AttachmentPreview({
  attachment,
  wrappedKeyForMe,
}: {
  attachment: AttachmentResponseDto;
  wrappedKeyForMe?: string | null;
}) {
  const privateKey = useIdentityStore((state) => state.privateKey);
  const [state, setState] = React.useState<"idle" | "loading" | "error">("idle");
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  async function handleDownload() {
    if (!privateKey || !wrappedKeyForMe) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      const { downloadUrl } = await apiFetch<DownloadUrlResponseDto>(
        `/api/v1/attachments/${attachment.id}/download-url`,
      );

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const encryptedBytes = await response.arrayBuffer();

      const messageContentKey = await CryptoService.unwrapContentKey(wrappedKeyForMe, privateKey);

      const blob = await decryptAttachmentFile({
        encryptedBytes,
        wrappedFileKey: attachment.encryptedKey,
        wrappedFileKeyNonce: attachment.nonce,
        messageContentKey,
        mimeType: attachment.mimeType,
      });

      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      setState("idle");

      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.originalFileName ?? attachment.fileName;
      link.click();
    } catch {
      setState("error");
    }
  }

  const isImage = attachment.type === "IMAGE";

  if (isImage && objectUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decrypted client-side, never a remote URL Next's image optimizer could proxy.
      <img
        src={objectUrl}
        alt={attachment.originalFileName ?? attachment.fileName}
        className="max-h-72 max-w-full rounded-md"
      />
    );
  }

  return (
    <div className="bg-foreground/[0.06] flex w-64 max-w-full items-center gap-2 rounded-md px-3 py-2">
      <FileIcon className="size-5 shrink-0 opacity-70" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {attachment.originalFileName ?? attachment.fileName}
        </p>
        <p className="text-xs opacity-70">{formatBytes(Number(attachment.size))}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={() => void handleDownload()}
        disabled={state === "loading"}
        aria-label={`Download ${attachment.originalFileName ?? attachment.fileName}`}
      >
        {state === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : state === "error" ? (
          <TriangleAlert className="size-4" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
