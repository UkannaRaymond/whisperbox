import * as OfflineDb from "./offline-db";
import { ATTACHMENT_CACHE_BUDGET_BYTES } from "../constants/offline.constants";
import type { CachedAttachmentBlob } from "../types/offline.types";

/**
 * Attachment caching (09-OFFLINE-SYNC.md § Core Features: "Attachment
 * caching"; § Deliverables listed alongside it — implemented here as its
 * own module since it has a distinct concern (binary blob storage +
 * size-bounded eviction) from the JSON-record stores in offline-db.ts,
 * even though it's built on the same IndexedDB database).
 *
 * Caches whatever bytes were downloaded for an attachment — which, per
 * the zero-knowledge architecture, are still AES-GCM ciphertext at this
 * point (see `Attachment.encryptedKey`/`nonce` — schemas/attachment.schema.ts).
 * This module never decrypts anything; it stores and evicts opaque blobs.
 * "Never store plaintext messages" (09-OFFLINE-SYNC.md § Local Storage)
 * extends to attachments the same way: decryption happens in memory, at
 * render time, elsewhere — never persisted.
 *
 * Fetching the actual bytes for a given attachment is intentionally NOT
 * this module's job — it takes a `fetchFn` the caller supplies, because
 * there is currently no server endpoint that issues a signed download URL
 * for an attachment's `storageKey` (Stage 05 only built
 * `POST /v1/attachments` to register metadata, and
 * `GET /v1/attachments/{id}` to read it back — not a byte-download route).
 * Building that endpoint is a real, separate piece of unfinished work;
 * this cache is ready for it via dependency injection rather than being
 * blocked on it.
 */

export type AttachmentFetchFn = (attachmentId: string) => Promise<Blob>;

/** Returns the cached blob if present, fetching and caching it via `fetchFn` otherwise. Always touches `lastAccessedAt` on a hit, for the LRU eviction policy below. */
export async function getOrFetchAttachment(
  attachmentId: string,
  fetchFn: AttachmentFetchFn,
): Promise<Blob> {
  const cached = await OfflineDb.getAttachmentBlob(attachmentId);
  if (cached) {
    await OfflineDb.putAttachmentBlob({ ...cached, lastAccessedAt: new Date().toISOString() });
    return cached.blob;
  }

  const blob = await fetchFn(attachmentId);
  await cacheAttachment(attachmentId, blob);
  return blob;
}

export async function cacheAttachment(attachmentId: string, blob: Blob): Promise<void> {
  const now = new Date().toISOString();
  const record: CachedAttachmentBlob = {
    attachmentId,
    blob,
    sizeBytes: blob.size,
    cachedAt: now,
    lastAccessedAt: now,
  };
  await OfflineDb.putAttachmentBlob(record);
  await evictIfOverBudget();
}

export async function getCachedAttachment(attachmentId: string): Promise<Blob | null> {
  const cached = await OfflineDb.getAttachmentBlob(attachmentId);
  if (!cached) return null;
  await OfflineDb.putAttachmentBlob({ ...cached, lastAccessedAt: new Date().toISOString() });
  return cached.blob;
}

export async function isCached(attachmentId: string): Promise<boolean> {
  return (await OfflineDb.getAttachmentBlob(attachmentId)) !== undefined;
}

export async function removeFromCache(attachmentId: string): Promise<void> {
  await OfflineDb.deleteAttachmentBlob(attachmentId);
}

/**
 * Evicts least-recently-accessed blobs until total cached size is back
 * under `ATTACHMENT_CACHE_BUDGET_BYTES`. Called automatically after every
 * `cacheAttachment`, so the cache never grows unbounded, but can also be
 * called on a schedule/on low-storage signals if the caller wants that.
 */
export async function evictIfOverBudget(): Promise<number> {
  const records = await OfflineDb.getAllAttachmentBlobRecords();
  let totalSize = records.reduce((sum, record) => sum + record.sizeBytes, 0);

  if (totalSize <= ATTACHMENT_CACHE_BUDGET_BYTES) return 0;

  const oldestFirst = [...records].sort((a, b) => a.lastAccessedAt.localeCompare(b.lastAccessedAt));

  let evictedCount = 0;
  for (const record of oldestFirst) {
    if (totalSize <= ATTACHMENT_CACHE_BUDGET_BYTES) break;
    await OfflineDb.deleteAttachmentBlob(record.attachmentId);
    totalSize -= record.sizeBytes;
    evictedCount += 1;
  }

  return evictedCount;
}

export async function getTotalCacheSize(): Promise<number> {
  const records = await OfflineDb.getAllAttachmentBlobRecords();
  return records.reduce((sum, record) => sum + record.sizeBytes, 0);
}

export async function clearAttachmentCache(): Promise<void> {
  const records = await OfflineDb.getAllAttachmentBlobRecords();
  await Promise.all(records.map((record) => OfflineDb.deleteAttachmentBlob(record.attachmentId)));
}
