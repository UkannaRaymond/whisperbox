/** The wire shape of a message as broadcast over the socket — mirrors MessageResponseDto's public fields (see schemas/message.schema.ts), redeclared here to avoid a server-only import. */
export interface SocketMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  type: string;
  encryptedContent: string;
  nonce: string;
  encryptionVersion: number;
  replyToMessageId: string | null;
  sequenceNumber: string;
  createdAt: string;

  encryptedKeyForMe: string | null;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
  lastSeenAt: string;
}

export interface MessageDeliveredPayload {
  messageId: string;
  conversationId: string;
  recipientId: string;
  deliveredAt: string;
}

export interface MessageReadPayload {
  conversationId: string;
  readerId: string;
  /** The last message included in this read receipt — everything up to and including this in sequence order was marked read. */
  upToMessageId: string;
  readAt: string;
}

export interface SocketAttachmentPayload {
  id: string;
  messageId: string;
  conversationId: string;
  uploadedById: string;
  type: string;
  fileName: string;
  originalFileName: string | null;
  mimeType: string;
  extension: string | null;
  size: string;
  encryptedKey: string;
  nonce: string;
  checksum: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedAt: string;
}

// --- Client → Server ---------------------------------------------------

export interface ClientToServerEvents {
  authenticate: (payload: { ticket: string }, ack: (ok: boolean) => void) => void;

  join_conversation: (
    payload: { conversationId: string },

    ack?: (ok: boolean, error?: string, onlineUserIds?: string[]) => void,
  ) => void;

  leave_conversation: (payload: { conversationId: string }, ack?: (ok: boolean) => void) => void;

  send_message: (
    payload: {
      conversationId: string;
      clientMessageId: string;
      type?: string;
      encryptedContent: string;
      nonce: string;
      encryptionVersion?: number;
      replyToMessageId?: string;
      encryptedKeys: Array<{ recipientId: string; encryptedKey: string; algorithm?: string }>;
    },
    ack?: (
      result: { ok: true; message: SocketMessagePayload } | { ok: false; error: string },
    ) => void,
  ) => void;

  typing_start: (payload: { conversationId: string }) => void;

  typing_stop: (payload: { conversationId: string }) => void;

  mark_read: (
    payload: { conversationId: string; messageId: string },
    ack?: (ok: boolean) => void,
  ) => void;

  attachment_uploaded: (
    payload: { attachmentId: string },
    ack?: (result: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
}

// --- Server → Client ---------------------------------------------------

export interface ServerToClientEvents {
  authenticated: (payload: { userId: string; onlineUserIds: string[] }) => void;

  new_message: (payload: SocketMessagePayload) => void;

  message_delivered: (payload: MessageDeliveredPayload) => void;

  message_read: (payload: MessageReadPayload) => void;

  /** A new attachment finished uploading on a message this connection can see. Emitted to every OTHER active member of the conversation (see registerAttachmentHandler) — never to the uploader's own connection, which already has it locally. */
  attachment_added: (payload: SocketAttachmentPayload) => void;

  user_online: (payload: PresencePayload) => void;

  user_offline: (payload: PresencePayload) => void;

  typing: (payload: TypingPayload) => void;

  /** Told to a client whose auth ticket expired/was rejected mid-session — it should fetch a fresh ticket and reconnect. */
  reconnect_required: (payload: { reason: string }) => void;
}

// --- Inter-server (Redis adapter) events, if ever needed --------------

/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface InterServerEvents {}
/* eslint-enable @typescript-eslint/no-empty-object-type */

/** Per-socket session data attached by the auth middleware (server/socket/auth.ts) — available as `socket.data` in every handler. */
export interface SocketData {
  userId: string;
}
