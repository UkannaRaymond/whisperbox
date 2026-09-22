"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { AttachmentResponseDto } from "@/schemas/attachment.schema";

/** Attachment metadata for one message — only fetched for messages whose `type` isn't TEXT (see ChatBubble), since a plain text message never has any. */
export function useMessageAttachments(messageId: string, enabled: boolean) {
  return useQuery<AttachmentResponseDto[]>({
    queryKey: ["attachments", "by-message", messageId],
    queryFn: () =>
      apiFetch<AttachmentResponseDto[]>(
        `/api/v1/attachments?messageId=${encodeURIComponent(messageId)}`,
      ),
    enabled,
    staleTime: 60_000,
  });
}
