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
import { apiFetch, ApiRequestError } from "@/lib/api-client";

export { ApiRequestError as SyncApiError };

/** Coordinates REST-based offline pulls, queued message delivery, and retry scheduling. */

// --- Pull: conversations -----------------------------------------------

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

const MESSAGE_STATUS_RANK = {
  SENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: -1,
} as const;

async function mergePulledMessage(message: LocalMessage): Promise<LocalMessage> {
  const existing = await OfflineDb.getMessage(message.id);
  if (!existing) return message;

  const existingRank = MESSAGE_STATUS_RANK[existing.status];
  const remoteRank = MESSAGE_STATUS_RANK[message.status];
  return existingRank > remoteRank
    ? { ...message, status: existing.status, updatedAt: existing.updatedAt }
    : message;
}

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
    const merged = await Promise.all(collected.map(mergePulledMessage));
    await OfflineDb.putMessages(merged);
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
      if (err instanceof ApiRequestError && err.status === 403) {
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

/** Resolves two local setting versions using last-write-wins by `updatedAt`. */
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
