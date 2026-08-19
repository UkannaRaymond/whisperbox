/**
 * Socket.IO event contract (08-WEBSOCKET.md § Event Contracts).
 *
 * Deliberately self-contained (no imports from server-only modules) so
 * this file can be safely imported from both `server/socket/*` and, later,
 * client-side code (`providers/socket-provider.tsx`, hooks, etc.) without
 * pulling Prisma or any server-only dependency into the browser bundle.
 *
 * Typed against Socket.IO's generic `Server<ClientToServerEvents,
 * ServerToClientEvents>` / `Socket<...>` parameters, so every `.emit()`
 * and `.on()` call is checked against this contract at compile time.
 */

// --- Shared payload shapes -------------------------------------------------

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
  /**
   * THE RECEIVING SOCKET'S OWN wrapped content key — never the same
   * value for two different recipients. This is why `new_message` is
   * emitted per-recipient (`io.to(userRoom(recipientId))`,
   * server/socket/handlers/send-message.handler.ts) rather than
   * broadcast once to the whole conversation room: a single shared
   * payload has no single correct value for this field, since each
   * recipient's copy of the message key is wrapped against their own
   * public key. Null if this recipient has no registered device key yet
   * (features/chat/utils/resolve-recipient-keys.ts) — same "can't
   * decrypt this one" case the REST path already handles.
   */
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

// --- Client → Server ---------------------------------------------------

export interface ClientToServerEvents {
  /**
   * Optional explicit re-authentication (e.g. after the client refreshed
   * its ticket mid-connection). Initial auth happens during the handshake
   * itself (see server/socket/auth.ts) — most clients never need to emit
   * this.
   */
  authenticate: (payload: { ticket: string }, ack: (ok: boolean) => void) => void;

  join_conversation: (
    payload: { conversationId: string },
    // `onlineUserIds` is a one-time snapshot of who's online among this
    // conversation's members *right now*, taken at join time — needed
    // because `user_online`/`user_offline` (below) are broadcast-only
    // going forward; a client that joins after someone already came
    // online would otherwise never find out until that person's
    // presence happens to change again. Omitted on a failed join.
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
}

// --- Server → Client ---------------------------------------------------

export interface ServerToClientEvents {
  /**
   * `onlineUserIds` is a one-time snapshot, taken at connect time, of
   * every OTHER user who is currently online among all the conversations
   * this connection just (re)joined (server/socket/gateway.ts). Needed
   * because `user_online`/`user_offline` below are broadcast-only for
   * *future* transitions — without this snapshot, a client that connects
   * after someone else is already online has no way to find out until
   * that person's presence happens to change again, which is why the
   * online indicator used to show everyone as offline until a presence
   * transition coincidentally occurred while you were connected.
   */
  authenticated: (payload: { userId: string; onlineUserIds: string[] }) => void;

  new_message: (payload: SocketMessagePayload) => void;

  message_delivered: (payload: MessageDeliveredPayload) => void;

  message_read: (payload: MessageReadPayload) => void;

  user_online: (payload: PresencePayload) => void;

  user_offline: (payload: PresencePayload) => void;

  typing: (payload: TypingPayload) => void;

  /** Told to a client whose auth ticket expired/was rejected mid-session — it should fetch a fresh ticket and reconnect. */
  reconnect_required: (payload: { reason: string }) => void;
}

// --- Inter-server (Redis adapter) events, if ever needed --------------

// Socket.IO's redis-adapter type parameter; left as a plain record since
// this project doesn't use custom inter-server events beyond what the
// adapter package handles internally.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

/** Per-socket session data attached by the auth middleware (server/socket/auth.ts) — available as `socket.data` in every handler. */
export interface SocketData {
  userId: string;
}
