/**
 * Offline sync constants (09-OFFLINE-SYNC.md).
 */

// IndexedDB layout — a separate database from Stage 07's
// `whisperbox-crypto` (features/encryption/services/secure-storage.ts).
// That database is narrowly scoped to key material and stays that way;
// this one holds broader app data (conversations, messages, attachment
// metadata, the offline queue, settings). Keeping them apart means a bug
// or migration in one never risks corrupting the other's much
// higher-stakes contents.
export const DB_NAME = "whisperbox-offline";
export const DB_VERSION = 1;

export const STORE_CONVERSATIONS = "conversations";
export const STORE_MESSAGES = "messages";
export const STORE_ATTACHMENTS_META = "attachmentsMeta";
export const STORE_ATTACHMENT_BLOBS = "attachmentBlobs";
export const STORE_PENDING_OPERATIONS = "pendingOperations";
export const STORE_USER_SETTINGS = "userSettings";
export const STORE_SYNC_CURSORS = "syncCursors";

// --- Retry scheduling ------------------------------------------------------

/** Base delay for exponential backoff (09-OFFLINE-SYNC.md: "Automatic retry"). */
export const RETRY_BASE_DELAY_MS = 2_000;
/** Ceiling so backoff doesn't grow unbounded on a long outage. */
export const RETRY_MAX_DELAY_MS = 5 * 60 * 1000; // 5 minutes
/** +/- this fraction of jitter, so many queued clients reconnecting at once don't all retry in lockstep (thundering herd). */
export const RETRY_JITTER_FACTOR = 0.3;
/** After this many failed attempts, a queue item stops auto-retrying and is left in FAILED for the caller/UI to decide (manual retry, discard, etc.). */
export const RETRY_MAX_ATTEMPTS = 8;

/** How often the retry scheduler checks for due items. */
export const RETRY_SCHEDULER_INTERVAL_MS = 5_000;

// --- Network monitor --------------------------------------------------------

/** Path health-checked to confirm actual API reachability — `navigator.onLine` alone is known to report true even when the network is actually unusable. */
export const HEALTH_CHECK_PATH = "/api/health";
export const HEALTH_CHECK_TIMEOUT_MS = 4_000;
export const HEALTH_CHECK_INTERVAL_MS = 30_000;

// --- Attachment cache --------------------------------------------------------

/** Total budget for cached attachment blobs before oldest-accessed entries are evicted. */
export const ATTACHMENT_CACHE_BUDGET_BYTES = 200 * 1024 * 1024; // 200MB

// --- Sync engine --------------------------------------------------------

/** Page size used when pulling messages/conversations during sync. */
export const SYNC_PAGE_SIZE = 50;
