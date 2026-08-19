import * as OfflineDb from "./offline-db";
import * as QueueManager from "./queue-manager";
import { isOnline, onNetworkStatusChange, checkNetworkNow } from "./network-monitor";
import { startRetryScheduler, stopRetryScheduler } from "./retry-scheduler";
import { SYNC_PAGE_SIZE } from "../constants/offline.constants";
import type {
  LocalConversation,
  LocalMessage,
  LocalSetting,
  TimelineEntry,
} from "../types/offline.types";

/**
 * Sync engine (09-OFFLINE-SYNC.md § Deliverables: "Sync service"; §
 * responsibilities: "Push pending messages", "Pull new messages",
 * "Resolve conflicts", "Retry failed uploads", "Remove completed jobs").
 *
 * Talks to the REST API only (`/api/v1/conversations`, `/api/v1/messages`)
 * — not the Socket.IO gateway. That's a deliberate boundary, not an
 * oversight: this feature's whole job is working when real-time delivery
 * *isn't* available, so it shouldn't depend on the socket connection's
 * state at all. It's also why "Do not modify... websocket implementation"
 * is satisfied by construction rather than by carefully avoiding a handful
 * of files — there was never a reason to touch them. (Messages composed
 * while online and successfully sent live-round-trip through the socket
 * gateway as normal; this engine only ever handles messages that were
 * queued because that path wasn't available at compose time, or on the
 * periodic/pull side, pure REST reads.)
 */

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Thrown by `apiFetch` — carries the HTTP status so callers can branch on it (e.g. 403 vs any other failure). */
export class SyncApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SyncApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...init });
  const body: ApiEnvelope<T> = await response.json();

  if (!response.ok || !body.success || body.data === undefined) {
    throw new SyncApiError(
      body.error?.message ?? `Request to ${path} failed (${response.status})`,
      response.status,
    );
  }

  return body.data;
}

// --- Pull: conversations -----------------------------------------------

/**
 * Refreshes the local conversation list. Conflict rule: "server timestamp
 * for conversation metadata" (09-OFFLINE-SYNC.md) — the server's copy
 * always overwrites the local one outright; there's no local-wins case to
 * reconcile, unlike profile/settings below.
 */
export async function pullConversations(): Promise<LocalConversation[]> {
  const all: LocalConversation[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await apiFetch<LocalConversation[]>(
      `/api/v1/conversations?take=${SYNC_PAGE_SIZE}${cursor ? `&cursor=${cursor}` : ""}`,
    );
    all.push(...page);
    if (page.length < SYNC_PAGE_SIZE) break;
    cursor = page[page.length - 1]!.id;
  }

  await OfflineDb.putConversations(all);
  return all;
}

// --- Pull: messages -------------------------------------------------------

/**
 * Pulls messages newer than this device's last-synced cursor for one
 * conversation.
 *
 * `GET /v1/conversations/{id}/messages` returns newest-first and only
 * supports cursoring *backward* through history (there's no `since`/
 * `after` parameter) — so "pull only what's new" is implemented as
 * "page backward from the newest message until we reach the last message
 * this device already has," rather than assuming a forward/incremental
 * API exists. For a first-ever sync (no stored cursor), this naturally
 * pages through the conversation's entire history instead.
 *
 * Known limitation: this endpoint filters out messages with `deleted:
 * true` entirely rather than including them as tombstones, so a message
 * deleted server-side after this device's last sync will just silently
 * stop appearing in future pulls — there's no signal for the local cache
 * to know to remove its own copy. Fixing that needs a tombstone/deletion-
 * feed mechanism on the server side, which doesn't exist yet; out of
 * scope for this stage's client-side deliverables.
 */
export async function pullNewMessages(conversationId: string): Promise<LocalMessage[]> {
  const cursorRecord = await OfflineDb.getSyncCursor(conversationId);
  const knownLastMessageId = cursorRecord?.lastMessageId ?? null;

  const collected: LocalMessage[] = [];
  let newestSeenId: string | null = null;
  let cursor: string | undefined;

  for (;;) {
    const page = await apiFetch<LocalMessage[]>(
      `/api/v1/conversations/${conversationId}/messages?take=${SYNC_PAGE_SIZE}${cursor ? `&cursor=${cursor}` : ""}`,
    );
    if (page.length === 0) break;
    if (newestSeenId === null) newestSeenId = page[0]!.id;

    let reachedKnownTerritory = false;
    for (const message of page) {
      if (message.id === knownLastMessageId) {
        reachedKnownTerritory = true;
        break;
      }
      collected.push(message);
    }

    if (reachedKnownTerritory || page.length < SYNC_PAGE_SIZE) break;
    cursor = page[page.length - 1]!.id;
  }

  if (collected.length > 0) {
    await OfflineDb.putMessages(collected);
  }
  if (newestSeenId) {
    await OfflineDb.putSyncCursor({
      conversationId,
      lastMessageId: newestSeenId,
      updatedAt: new Date().toISOString(),
    });
  }

  return collected;
}

export async function pullNewMessagesForAllConversations(): Promise<void> {
  const conversations = await OfflineDb.getAllConversations();
  // Sequential, not Promise.all: keeps this from firing dozens of
  // concurrent requests against the API on first sync / after a long
  // outage with many conversations.
  for (const conversation of conversations) {
    try {
      await pullNewMessages(conversation.id);
    } catch (err) {
      // A 403 here means the server no longer considers this device's
      // user a member of this conversation (removed, or the local copy
      // is simply stale — e.g. leftover seed/demo data from another
      // account on a shared browser profile). That's not a transient
      // failure to retry: keeping the conversation around would just
      // fail the same way, forever, on every future sync pass, and
      // — before this fix — aborted the ENTIRE pass, so no other
      // conversation's messages synced either. Prune it locally and
      // move on to the rest.
      if (err instanceof SyncApiError && err.status === 403) {
        console.warn(
          `Removing local conversation ${conversation.id}: server says this device is no longer a member.`,
        );
        await OfflineDb.deleteConversation(conversation.id);
        continue;
      }
      // Any other error (network blip, 500, etc.) — log and move on to
      // the next conversation rather than letting one bad pull block
      // every other conversation's sync for this pass.
      console.error(`Failed to sync messages for conversation ${conversation.id}:`, err);
    }
  }
}

// --- Push: pending message queue -------------------------------------

/**
 * Attempts delivery for everything currently due (fresh PENDING items,
 * plus RETRYING items whose backoff has elapsed) — 09-OFFLINE-SYNC.md:
 * "Push pending messages", "Retry failed uploads".
 *
 * Per-conversation delivery order matters (a reply should never land
 * before the message it's replying to actually exists, and generally
 * users expect their own messages in a conversation to arrive in the
 * order they hit "send"), so items are grouped by conversation and each
 * conversation's queue is drained sequentially; different conversations
 * are pushed concurrently since they don't have any ordering relationship
 * with each other.
 */
export async function pushPendingMessages(): Promise<void> {
  const due = await QueueManager.getDueForDelivery();
  if (due.length === 0) return;

  const byConversation = new Map<string, typeof due>();
  for (const operation of due) {
    const list = byConversation.get(operation.conversationId) ?? [];
    list.push(operation);
    byConversation.set(operation.conversationId, list);
  }

  await Promise.all(
    Array.from(byConversation.values()).map(async (operations) => {
      for (const operation of operations) {
        await attemptDelivery(operation.id);
      }
    }),
  );
}

async function attemptDelivery(operationId: string): Promise<void> {
  const operation = await QueueManager.getOperation(operationId);
  if (!operation) return;

  await QueueManager.markUploading(operationId);

  try {
    const message = await apiFetch<LocalMessage>("/api/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(operation.payload),
    });

    // The server is idempotent on clientMessageId (see
    // services/message.service.ts#createMessage), so a retry that
    // actually succeeded server-side on an earlier attempt this device
    // never got a response for still resolves correctly here.
    await OfflineDb.putMessage(message);
    await QueueManager.markDeliveredAndRemove(operationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await QueueManager.markFailedAndScheduleRetry(operationId, message);
  }
}

// --- Conflict resolution: settings / profile-style data --------------

/**
 * Last-write-wins by `updatedAt` (09-OFFLINE-SYNC.md: "Last-write-wins for
 * profile updates") — a pure, independently-testable merge function.
 * There is currently no server-side settings-sync endpoint for this to be
 * wired up against (only `PATCH /v1/users/me`, which is a different,
 * single-device-at-a-time flow); this implements the *policy* correctly
 * and is ready to be called once that sync pipeline exists, rather than
 * leaving the conflict rule unimplemented until then.
 */
export function resolveSettingConflict<T>(
  local: LocalSetting<T>,
  remote: LocalSetting<T>,
): LocalSetting<T> {
  return new Date(remote.updatedAt) > new Date(local.updatedAt) ? remote : local;
}

// --- Merged timeline (enables optimistic UI) --------------------------

export async function getConversationTimeline(conversationId: string): Promise<TimelineEntry[]> {
  const [messages, pendingOps] = await Promise.all([
    OfflineDb.getMessagesForConversation(conversationId),
    QueueManager.getPendingForConversation(conversationId),
  ]);

  const entries: TimelineEntry[] = [
    ...messages.map((message): TimelineEntry => ({ kind: "message", message })),
    ...pendingOps.map((operation): TimelineEntry => ({ kind: "pending", operation })),
  ];

  entries.sort((a, b) => {
    const aTime = a.kind === "message" ? a.message.createdAt : a.operation.createdAt;
    const bTime = b.kind === "message" ? b.message.createdAt : b.operation.createdAt;
    return aTime.localeCompare(bTime);
  });

  return entries;
}

// --- Orchestration --------------------------------------------------------

let unsubscribeNetwork: (() => void) | null = null;

/**
 * Wires the sync engine up to the network monitor and retry scheduler:
 * runs a full sync on the online transition, and drains the queue on
 * every retry-scheduler tick while online. Call once at app startup,
 * alongside `startNetworkMonitor()`.
 */
export function startSyncEngine(): void {
  stopSyncEngine();

  unsubscribeNetwork = onNetworkStatusChange((status) => {
    if (status === "online") void runFullSync();
  });

  startRetryScheduler(() => {
    if (isOnline()) void pushPendingMessages();
  });
}

export function stopSyncEngine(): void {
  unsubscribeNetwork?.();
  unsubscribeNetwork = null;
  stopRetryScheduler();
}

/**
 * Entry point for a full sync pass. Deliberately swallows its own
 * errors (rather than letting `pullConversations`'s "Authentication
 * required" — or any other transient failure — propagate as an uncaught
 * rejection): this is called from a network-status listener
 * (`startSyncEngine`), not a user action, so there's no request/response
 * cycle to surface an error through. A failed pass just means the retry
 * scheduler / next online transition tries again later.
 */
export async function runFullSync(): Promise<void> {
  const status = await checkNetworkNow();
  if (status !== "online") return;

  try {
    await pullConversations();
    await pullNewMessagesForAllConversations();
    await pushPendingMessages();
  } catch (err) {
    console.error("Sync pass failed, will retry on the next online transition:", err);
  }
}
