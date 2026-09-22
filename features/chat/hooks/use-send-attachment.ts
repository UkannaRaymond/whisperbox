"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import * as CryptoService from "@/features/encryption/services/crypto.service";
import { apiFetch } from "@/lib/api-client";
import { useSocket } from "@/providers/socket-provider";
import { resolveRecipientKeys } from "../utils/resolve-recipient-keys";
import { classifyMimeType, encryptAttachmentFile } from "../utils/attachment-crypto";
import { timelineQueryKey } from "./use-conversation-timeline";
import type { CreateMessageDto, MessageResponseDto } from "@/schemas/message.schema";
import type { AttachmentResponseDto, UploadUrlResponseDto } from "@/schemas/attachment.schema";

import {
  sendMessageOverSocket,
  SocketAckTimeoutError,
} from "@/features/websocket/utils/socket-send";
import type { AppClientSocket } from "@/features/websocket/utils/socket-send";

interface SendAttachmentInput {
  conversationId: string;
  file: File;
  /** Optional caption — sent as the message's (encrypted) text content. */
  caption?: string;
}

/** Fire-and-forget: tells the socket gateway an attachment finished uploading, so it can broadcast `attachment_added` to the rest of the conversation (server/socket/handlers/attachment.handler.ts). Never awaited by the caller — a slow/failed broadcast must not fail or delay a send the file itself already succeeded at; the recipient falls back to seeing it on their next fetch, same as before this existed. */
function notifyAttachmentUploaded(socket: AppClientSocket | null, attachmentId: string): void {
  if (!socket) return;
  socket.emit("attachment_uploaded", { attachmentId }, (result) => {
    if (!result.ok) {
      console.warn("[attachment] real-time broadcast failed:", result.error);
    }
  });
}

/** Encrypts and sends an attachment message, then uploads the encrypted file. */
export function useSendAttachment() {
  const queryClient = useQueryClient();
  const { socket, status: socketStatus } = useSocket();

  return useMutation({
    mutationFn: async ({ conversationId, file, caption }: SendAttachmentInput) => {
      const recipients = await resolveRecipientKeys(conversationId);

      // Generated manually (rather than via the higher-level
      // `encryptForRecipients`) because the raw `CryptoKey` needs to stay
      // in scope afterward to also wrap the attachment's own file key —
      // `encryptForRecipients` wraps-and-discards it internally.
      const contentKey = await CryptoService.generateContentKey();
      const { ciphertext, nonce } = await CryptoService.encryptText(caption ?? "", contentKey);
      const wrappedKeys = await Promise.all(
        recipients.map((recipient) =>
          CryptoService.wrapContentKey(contentKey, recipient.publicKey, recipient.recipientId),
        ),
      );

      const { messageType, attachmentType } = classifyMimeType(
        file.type || "application/octet-stream",
      );

      const messagePayload: CreateMessageDto = {
        conversationId,
        clientMessageId: crypto.randomUUID(),
        type: messageType,
        encryptedContent: ciphertext,
        nonce,
        encryptionVersion: 1,
        encryptedKeys: wrappedKeys.map((key) => ({
          recipientId: key.recipientId,
          encryptedKey: key.wrappedKey,
          algorithm: key.algorithm,
        })),
      };

      let messageId: string;

      if (socket && socketStatus === "connected") {
        try {
          const result = await sendMessageOverSocket(socket, messagePayload);
          if (!result.ok) throw new Error(result.error);
          messageId = result.message.id;
        } catch (err) {
          if (!(err instanceof SocketAckTimeoutError)) throw err;
          // No ack in time — fall through to REST below rather than
          // losing the send, same fallback reasoning as use-send-message.ts.
          const message = await apiFetch<MessageResponseDto>("/api/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messagePayload),
          });
          messageId = message.id;
        }
      } else {
        const message = await apiFetch<MessageResponseDto>("/api/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messagePayload),
        });
        messageId = message.id;
      }

      const encrypted = await encryptAttachmentFile(file, contentKey);

      const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;

      const { storageKey, uploadUrl } = await apiFetch<UploadUrlResponseDto>(
        "/api/v1/attachments/upload-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            extension,
          }),
        },
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: encrypted.encryptedBlob,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status})`);
      }

      const attachment = await apiFetch<AttachmentResponseDto>("/api/v1/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          type: attachmentType,
          fileName: file.name,
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          extension,
          size: file.size,
          storageKey,
          encryptedKey: encrypted.wrappedFileKey,
          nonce: encrypted.wrappedFileKeyNonce,
          checksum: encrypted.checksum,
        }),
      });

      notifyAttachmentUploaded(socket, attachment.id);

      return { messageId, attachment };
    },
    onSuccess: (_result, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: timelineQueryKey(conversationId) });
    },
  });
}
