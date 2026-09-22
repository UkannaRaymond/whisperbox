import { createLogger } from "../../logger";
import { attachmentService } from "../../../services";
import { repositories } from "../../../repositories/prisma";
import { NotFoundError } from "../../../errors";
import { conversationRoom } from "../rooms";
import type { AppSocket } from "../socket-auth";
import type { SocketAttachmentPayload } from "../../../features/websocket/types/socket-events.types";

const log = createLogger("socket:handler:attachment");

export function registerAttachmentHandler(socket: AppSocket): void {
  socket.on(
    "attachment_uploaded",
    async (
      { attachmentId }: { attachmentId: string },
      ack?: (result: { ok: true } | { ok: false; error: string }) => void,
    ) => {
      try {
        const attachment = await attachmentService.getAttachment(socket.data.userId, attachmentId);

        const message = await repositories.messages.findById(attachment.messageId);
        if (!message) throw new NotFoundError("Message", attachment.messageId);

        const payload: SocketAttachmentPayload = {
          id: attachment.id,
          messageId: attachment.messageId,
          conversationId: message.conversationId,
          uploadedById: attachment.uploadedById,
          type: attachment.type,
          fileName: attachment.fileName,
          originalFileName: attachment.originalFileName,
          mimeType: attachment.mimeType,
          extension: attachment.extension,
          size: attachment.size,
          encryptedKey: attachment.encryptedKey,
          nonce: attachment.nonce,
          checksum: attachment.checksum,
          width: attachment.width,
          height: attachment.height,
          duration: attachment.duration,
          uploadedAt: attachment.uploadedAt,
        };

        socket.to(conversationRoom(message.conversationId)).emit("attachment_added", payload);

        ack?.({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        log.error(
          { error, attachmentId, userId: socket.data.userId },
          "attachment_uploaded failed",
        );
        ack?.({ ok: false, error: message });
      }
    },
  );
}
