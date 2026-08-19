import type { ConversationResponseDto } from "@/schemas/conversation.schema";
import type { MessageResponseDto } from "@/schemas/message.schema";
import type { AttachmentResponseDto } from "@/schemas/attachment.schema";
import type { CreateMessageDto } from "@/schemas/message.schema";

/**
 * Local storage record types for the offline sync feature
 * (09-OFFLINE-SYNC.md § Local Storage, § Queue States).
 *
 * Conversation/Message/Attachment records reuse the exact REST response
 * DTO shapes (`@/schemas/*.schema`) rather than redefining parallel types,
 * so the offline cache can never silently drift from what the API
 * actually returns — the drift between duplicated type definitions is
 * exactly the class of bug that kept surfacing elsewhere in this
 * codebase before earlier stages reconciled it.
 */

export type LocalConversation = ConversationResponseDto;

/** A message as stored locally — server-confirmed messages are stored verbatim; see QueuedMessageOperation for not-yet-sent ones. */
export type LocalMessage = MessageResponseDto;

/** Attachment metadata only — the encrypted blob itself lives in the separate attachment-blob cache (features/offline/services/attachment-cache.ts), keyed the same way. */
export type LocalAttachmentMeta = AttachmentResponseDto;

// --- Offline queue (09-OFFLINE-SYNC.md § Queue States) --------------------

export type QueueItemState = "PENDING" | "UPLOADING" | "DELIVERED" | "FAILED" | "RETRYING";

/**
 * A queued "send message" operation. `id` is always the message's
 * `clientMessageId` — the same idempotency key the REST API
 * (`POST /v1/messages`) and the socket gateway (`send_message`) already
 * key on, so there is exactly one identity for a given outgoing message
 * across every transport and this queue.
 *
 * `payload` must already be fully encrypted (see
 * `features/encryption/services/crypto.service.ts#encryptForRecipients`)
 * before enqueueing — composing and encrypting a message doesn't require
 * network access, so there's no reason for the queue to ever hold
 * plaintext even transiently. "Never store plaintext messages"
 * (09-OFFLINE-SYNC.md § Local Storage) applies here just as much as to
 * the message store itself.
 */
export interface QueuedMessageOperation {
  id: string;
  conversationId: string;
  payload: CreateMessageDto;
  state: QueueItemState;
  attempts: number;
  lastError?: string;
  /** ISO timestamp; the retry scheduler won't attempt this item again before this time. Unset while PENDING/UPLOADING/DELIVERED. */
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Sync bookkeeping --------------------------------------------------------

/** Tracks how far incremental pull has progressed for one conversation. */
export interface SyncCursor {
  conversationId: string;
  /** The `id` of the most recent message this device has pulled for this conversation — passed as `cursor` to `GET /v1/conversations/{id}/messages`. */
  lastMessageId: string | null;
  updatedAt: string;
}

/** Generic local key/value settings record (theme, notification preferences, etc.). Conflict rule: last-write-wins by `updatedAt` (09-OFFLINE-SYNC.md § Conflict Resolution). */
export interface LocalSetting<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
}

// --- Attachment blob cache --------------------------------------------------

/** A cached, still-encrypted attachment blob plus the bookkeeping needed for size-bounded eviction. */
export interface CachedAttachmentBlob {
  attachmentId: string;
  blob: Blob;
  sizeBytes: number;
  cachedAt: string;
  lastAccessedAt: string;
}

// --- Merged view for rendering (enables "Optimistic UI") -------------------

/**
 * One entry in a conversation's timeline, merging server-confirmed
 * messages with not-yet-delivered queue items into a single ordered list
 * — what a UI layer would actually render. Building this view is what
 * "enables" optimistic UI (09-OFFLINE-SYNC.md § Core Features); rendering
 * it is a UI-layer concern out of scope here (Prompt-09 doesn't list
 * components/hooks).
 */
export type TimelineEntry =
  | { kind: "message"; message: LocalMessage }
  | { kind: "pending"; operation: QueuedMessageOperation };
