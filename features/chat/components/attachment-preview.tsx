"use client";

import * as React from "react";
import { Download, File as FileIcon, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useIdentityStore } from "@/features/auth/store/identity-store";
import * as CryptoService from "@/features/encryption/services/crypto.service";
import { decryptAttachmentFile } from "../utils/attachment-crypto";
import type { AttachmentResponseDto, DownloadUrlResponseDto } from "@/schemas/attachment.schema";

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

  const isImage = attachment.type === "IMAGE";

  /**
   * Fetch and decrypt the attachment.
   *
   * Images are loaded automatically so they appear directly
   * in the conversation. Other file types are loaded only when
   * the user explicitly requests a download.
   */
  const loadAttachment = React.useCallback(async () => {
    if (!privateKey || !wrappedKeyForMe) {
      setState("error");
      return null;
    }

    if (objectUrl) {
      return objectUrl;
    }

    setState("loading");

    try {
      const { downloadUrl } = await apiFetch<DownloadUrlResponseDto>(
        `/api/v1/attachments/${attachment.id}/download-url`,
      );

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

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

      return url;
    } catch {
      setState("error");
      return null;
    }
  }, [attachment, privateKey, wrappedKeyForMe, objectUrl]);

  /**
   * Images are previews, so load them automatically.
   *
   * Non-image files remain on-demand because they can be large.
   */
  React.useEffect(() => {
    if (!isImage) return;

    void loadAttachment();
  }, [isImage, loadAttachment]);

  /**
   * Revoke the object URL when the component unmounts.
   */
  React.useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  async function handleDownload() {
    const url = await loadAttachment();

    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.originalFileName ?? attachment.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (isImage) {
    if (state === "loading") {
      return (
        <div className="bg-foreground/6 flex h-40 w-64 max-w-full items-center justify-center rounded-md">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      );
    }

    if (state === "error" || !objectUrl) {
      return (
        <div className="bg-foreground/6 flex w-64 max-w-full items-center gap-2 rounded-md px-3 py-2">
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />

          <p className="min-w-0 flex-1 truncate text-xs">
            Couldn't load {attachment.originalFileName ?? attachment.fileName}
          </p>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => void loadAttachment()}
            aria-label="Retry loading attachment"
          >
            <Download className="size-4" aria-hidden="true" />
          </Button>
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={objectUrl}
        alt={attachment.originalFileName ?? attachment.fileName}
        className="max-h-72 max-w-full cursor-pointer rounded-md object-contain"
      />
    );
  }

  return (
    <div className="bg-foreground/6 flex w-64 max-w-full items-center gap-2 rounded-md px-3 py-2">
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

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
