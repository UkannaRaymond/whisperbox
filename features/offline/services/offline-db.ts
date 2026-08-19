import {
  DB_NAME,
  DB_VERSION,
  STORE_CONVERSATIONS,
  STORE_MESSAGES,
  STORE_ATTACHMENTS_META,
  STORE_ATTACHMENT_BLOBS,
  STORE_PENDING_OPERATIONS,
  STORE_USER_SETTINGS,
  STORE_SYNC_CURSORS,
} from "../constants/offline.constants";
import type {
  LocalConversation,
  LocalMessage,
  LocalAttachmentMeta,
  QueuedMessageOperation,
  LocalSetting,
  SyncCursor,
  CachedAttachmentBlob,
  QueueItemState,
} from "../types/offline.types";

/**
 * IndexedDB abstraction (09-OFFLINE-SYNC.md § Deliverables: "IndexedDB
 * layer"). Dependency-free, same rationale as Stage 07's secure-storage.ts:
 * seven small stores don't justify a new dependency (`idb`/`dexie`).
 *
 * Ordering note: `Message.sequenceNumber` is a stringified `BigInt` (see
 * services/mappers.ts on the server) — sorting those strings
 * lexicographically is WRONG as soon as digit counts differ ("10" sorts
 * before "9"). Every ordered query here sorts by `createdAt` (a fixed-width
 * ISO 8601 timestamp, which sorts correctly as a plain string) instead,
 * using `sequenceNumber` only as stored data, never as a sort key.
 */

function assertBrowserEnvironment(): void {
  if (typeof indexedDB === "undefined") {
    throw new Error(
      "Offline storage requires a browser environment with IndexedDB support (this code must not run server-side).",
    );
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  assertBrowserEnvironment();

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
          db.createObjectStore(STORE_CONVERSATIONS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const messages = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
          messages.createIndex("byConversation", "conversationId", { unique: false });
          messages.createIndex("byConversationCreatedAt", ["conversationId", "createdAt"], {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains(STORE_ATTACHMENTS_META)) {
          const attachments = db.createObjectStore(STORE_ATTACHMENTS_META, { keyPath: "id" });
          attachments.createIndex("byMessage", "messageId", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_ATTACHMENT_BLOBS)) {
          const blobs = db.createObjectStore(STORE_ATTACHMENT_BLOBS, { keyPath: "attachmentId" });
          blobs.createIndex("byLastAccessed", "lastAccessedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_PENDING_OPERATIONS)) {
          const queue = db.createObjectStore(STORE_PENDING_OPERATIONS, { keyPath: "id" });
          queue.createIndex("byConversation", "conversationId", { unique: false });
          queue.createIndex("byState", "state", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_USER_SETTINGS)) {
          db.createObjectStore(STORE_USER_SETTINGS, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(STORE_SYNC_CURSORS)) {
          db.createObjectStore(STORE_SYNC_CURSORS, { keyPath: "conversationId" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open offline storage database"));
    });
  }

  return dbPromise;
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  return runRequest(fn(tx.objectStore(storeName)));
}

// --- Conversations -----------------------------------------------------

export async function putConversation(conversation: LocalConversation): Promise<void> {
  await withStore(STORE_CONVERSATIONS, "readwrite", (store) => store.put(conversation));
}

export async function putConversations(conversations: LocalConversation[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_CONVERSATIONS, "readwrite");
  const store = tx.objectStore(STORE_CONVERSATIONS);
  for (const conversation of conversations) store.put(conversation);
  await txDone(tx);
}

export async function getConversation(id: string): Promise<LocalConversation | undefined> {
  return withStore(STORE_CONVERSATIONS, "readonly", (store) => store.get(id));
}

export async function getAllConversations(): Promise<LocalConversation[]> {
  return withStore(STORE_CONVERSATIONS, "readonly", (store) => store.getAll());
}

/**
 * Removes a conversation this device is no longer a member of (server
 * returned 403 "You are not a member of this conversation" on a sync
 * pull — see `pullNewMessages`'s 403 handling in ../services/sync-engine.ts).
 * Also drops its sync cursor, so if the same conversation id is ever
 * legitimately rejoined later, sync starts fresh rather than resuming
 * from a cursor for messages this device may no longer be entitled to.
 * Does NOT delete the conversation's cached messages — a user leaving a
 * conversation is not a request to forget having read it.
 */
export async function deleteConversation(id: string): Promise<void> {
  await withStore(STORE_CONVERSATIONS, "readwrite", (store) => store.delete(id));
  await deleteSyncCursor(id);
}

// --- Messages -----------------------------------------------------------

export async function putMessage(message: LocalMessage): Promise<void> {
  await withStore(STORE_MESSAGES, "readwrite", (store) => store.put(message));
}

export async function putMessages(messages: LocalMessage[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);
  for (const message of messages) store.put(message);
  await txDone(tx);
}

/** Every locally stored message for a conversation, oldest first (sorted by `createdAt` — see the module doc comment on why not `sequenceNumber`). */
export async function getMessagesForConversation(conversationId: string): Promise<LocalMessage[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_MESSAGES, "readonly");
  const index = tx.objectStore(STORE_MESSAGES).index("byConversation");
  const messages = await runRequest(index.getAll(IDBKeyRange.only(conversationId)));
  return messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getMessage(id: string): Promise<LocalMessage | undefined> {
  return withStore(STORE_MESSAGES, "readonly", (store) => store.get(id));
}

// --- Attachment metadata --------------------------------------------------

export async function putAttachmentMeta(attachment: LocalAttachmentMeta): Promise<void> {
  await withStore(STORE_ATTACHMENTS_META, "readwrite", (store) => store.put(attachment));
}

export async function getAttachmentMeta(id: string): Promise<LocalAttachmentMeta | undefined> {
  return withStore(STORE_ATTACHMENTS_META, "readonly", (store) => store.get(id));
}

export async function getAttachmentMetaForMessage(
  messageId: string,
): Promise<LocalAttachmentMeta[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_ATTACHMENTS_META, "readonly");
  const index = tx.objectStore(STORE_ATTACHMENTS_META).index("byMessage");
  return runRequest(index.getAll(IDBKeyRange.only(messageId)));
}

// --- Attachment blob cache (raw store access — see attachment-cache.ts for the eviction policy built on top) ---

export async function putAttachmentBlob(record: CachedAttachmentBlob): Promise<void> {
  await withStore(STORE_ATTACHMENT_BLOBS, "readwrite", (store) => store.put(record));
}

export async function getAttachmentBlob(
  attachmentId: string,
): Promise<CachedAttachmentBlob | undefined> {
  return withStore(STORE_ATTACHMENT_BLOBS, "readonly", (store) => store.get(attachmentId));
}

export async function deleteAttachmentBlob(attachmentId: string): Promise<void> {
  await withStore(STORE_ATTACHMENT_BLOBS, "readwrite", (store) => store.delete(attachmentId));
}

export async function getAllAttachmentBlobRecords(): Promise<CachedAttachmentBlob[]> {
  return withStore(STORE_ATTACHMENT_BLOBS, "readonly", (store) => store.getAll());
}

// --- Pending operations (offline queue) -----------------------------------

export async function putPendingOperation(operation: QueuedMessageOperation): Promise<void> {
  await withStore(STORE_PENDING_OPERATIONS, "readwrite", (store) => store.put(operation));
}

export async function getPendingOperation(id: string): Promise<QueuedMessageOperation | undefined> {
  return withStore(STORE_PENDING_OPERATIONS, "readonly", (store) => store.get(id));
}

export async function deletePendingOperation(id: string): Promise<void> {
  await withStore(STORE_PENDING_OPERATIONS, "readwrite", (store) => store.delete(id));
}

export async function getAllPendingOperations(): Promise<QueuedMessageOperation[]> {
  return withStore(STORE_PENDING_OPERATIONS, "readonly", (store) => store.getAll());
}

export async function getPendingOperationsByState(
  state: QueueItemState,
): Promise<QueuedMessageOperation[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_PENDING_OPERATIONS, "readonly");
  const index = tx.objectStore(STORE_PENDING_OPERATIONS).index("byState");
  return runRequest(index.getAll(IDBKeyRange.only(state)));
}

export async function getPendingOperationsForConversation(
  conversationId: string,
): Promise<QueuedMessageOperation[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_PENDING_OPERATIONS, "readonly");
  const index = tx.objectStore(STORE_PENDING_OPERATIONS).index("byConversation");
  return runRequest(index.getAll(IDBKeyRange.only(conversationId)));
}

// --- User settings (conflict rule: last-write-wins by updatedAt) ----------

export async function putSetting<T>(setting: LocalSetting<T>): Promise<void> {
  await withStore(STORE_USER_SETTINGS, "readwrite", (store) => store.put(setting));
}

export async function getSetting<T>(key: string): Promise<LocalSetting<T> | undefined> {
  return withStore(STORE_USER_SETTINGS, "readonly", (store) => store.get(key));
}

// --- Sync cursors ------------------------------------------------------

export async function putSyncCursor(cursor: SyncCursor): Promise<void> {
  await withStore(STORE_SYNC_CURSORS, "readwrite", (store) => store.put(cursor));
}

export async function getSyncCursor(conversationId: string): Promise<SyncCursor | undefined> {
  return withStore(STORE_SYNC_CURSORS, "readonly", (store) => store.get(conversationId));
}

export async function deleteSyncCursor(conversationId: string): Promise<void> {
  await withStore(STORE_SYNC_CURSORS, "readwrite", (store) => store.delete(conversationId));
}

// --- Helpers -----------------------------------------------------------

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/** Wipes every store — e.g. on logout, matching secure-storage.ts's clearAllSecureStorage for the crypto DB. */
export async function clearAllOfflineStorage(): Promise<void> {
  const db = await openDatabase();
  const storeNames = [
    STORE_CONVERSATIONS,
    STORE_MESSAGES,
    STORE_ATTACHMENTS_META,
    STORE_ATTACHMENT_BLOBS,
    STORE_PENDING_OPERATIONS,
    STORE_USER_SETTINGS,
    STORE_SYNC_CURSORS,
  ];
  const tx = db.transaction(storeNames, "readwrite");
  for (const name of storeNames) tx.objectStore(name).clear();
  await txDone(tx);
}
