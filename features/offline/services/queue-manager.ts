import { createMessageSchema } from "@/schemas/message.schema";
import * as OfflineDb from "./offline-db";
import { computeNextRetryAt, hasExceededMaxAttempts, isDue } from "./retry-scheduler";
import type { QueuedMessageOperation } from "../types/offline.types";
import type { CreateMessageDto } from "@/schemas/message.schema";

/**
 * Offline queue (09-OFFLINE-SYNC.md § Deliverables: "Queue manager";
 * § Queue States: Pending, Uploading, Delivered, Failed, Retrying).
 *
 * Owns state transitions for queued "send message" operations. Actually
 * attempting delivery is sync-engine.ts's job — this module is the
 * bookkeeping layer underneath it (mirrors the split between
 * repositories/ and services/ on the server: this is the "repository,"
 * sync-engine.ts is the "service").
 */

/**
 * Enqueues a message send. Validates the payload against the exact same
 * Zod schema `POST /v1/messages` uses, so nothing malformed can sit in the
 * queue only to fail validation later when finally pushed — fail fast, at
 * compose time, while the user can still be told immediately.
 */
export async function enqueueMessage(payload: CreateMessageDto): Promise<QueuedMessageOperation> {
  const validated = createMessageSchema.parse(payload);

  const now = new Date().toISOString();
  const operation: QueuedMessageOperation = {
    id: validated.clientMessageId,
    conversationId: validated.conversationId,
    payload: validated,
    state: "PENDING",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await OfflineDb.putPendingOperation(operation);
  return operation;
}

export async function markUploading(id: string): Promise<void> {
  const operation = await OfflineDb.getPendingOperation(id);
  if (!operation) return;
  await OfflineDb.putPendingOperation({
    ...operation,
    state: "UPLOADING",
    updatedAt: new Date().toISOString(),
  });
}

/** Delivery succeeded — per 09-OFFLINE-SYNC.md's sync engine responsibilities ("Remove completed jobs"), this removes the item entirely rather than leaving a DELIVERED tombstone; the now-authoritative server message belongs in the messages store instead (see sync-engine.ts). */
export async function markDeliveredAndRemove(id: string): Promise<void> {
  await OfflineDb.deletePendingOperation(id);
}

/**
 * Delivery failed. Increments the attempt count and either schedules the
 * next retry (state -> RETRYING, with backoff via retry-scheduler.ts) or,
 * past `RETRY_MAX_ATTEMPTS`, leaves it in a terminal FAILED state for the
 * caller/UI to surface (manual retry, discard, etc.) rather than retrying
 * forever.
 */
export async function markFailedAndScheduleRetry(
  id: string,
  error: string,
): Promise<QueuedMessageOperation | null> {
  const operation = await OfflineDb.getPendingOperation(id);
  if (!operation) return null;

  const attempts = operation.attempts + 1;
  const exceeded = hasExceededMaxAttempts(attempts);

  const updated: QueuedMessageOperation = {
    ...operation,
    attempts,
    lastError: error,
    state: exceeded ? "FAILED" : "RETRYING",
    nextRetryAt: exceeded ? undefined : computeNextRetryAt(attempts),
    updatedAt: new Date().toISOString(),
  };

  await OfflineDb.putPendingOperation(updated);
  return updated;
}

/** Resets a terminally FAILED item back to PENDING for a manual user-triggered retry, clearing the attempt count so it gets the full backoff schedule again. */
export async function resetForManualRetry(id: string): Promise<void> {
  const operation = await OfflineDb.getPendingOperation(id);
  if (!operation) return;
  await OfflineDb.putPendingOperation({
    ...operation,
    state: "PENDING",
    attempts: 0,
    lastError: undefined,
    nextRetryAt: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeOperation(id: string): Promise<void> {
  await OfflineDb.deletePendingOperation(id);
}

export async function getOperation(id: string): Promise<QueuedMessageOperation | undefined> {
  return OfflineDb.getPendingOperation(id);
}

export async function getAllPending(): Promise<QueuedMessageOperation[]> {
  return OfflineDb.getAllPendingOperations();
}

export async function getPendingForConversation(
  conversationId: string,
): Promise<QueuedMessageOperation[]> {
  return OfflineDb.getPendingOperationsForConversation(conversationId);
}

/** Everything currently due for a delivery attempt: freshly PENDING items, plus RETRYING items whose backoff has elapsed. Excludes UPLOADING (already in flight), DELIVERED (nothing left to do), and FAILED (exceeded retries, needs a manual retry). */
export async function getDueForDelivery(): Promise<QueuedMessageOperation[]> {
  const [pending, retrying] = await Promise.all([
    OfflineDb.getPendingOperationsByState("PENDING"),
    OfflineDb.getPendingOperationsByState("RETRYING"),
  ]);

  const dueRetrying = retrying.filter((op) => isDue(op.nextRetryAt));

  return [...pending, ...dueRetrying];
}
