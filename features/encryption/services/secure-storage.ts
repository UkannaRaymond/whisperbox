import {
  DB_NAME,
  DB_VERSION,
  STORE_IDENTITY,
  STORE_DEVICE_KEYS,
  STORE_SESSION_METADATA,
  LEGACY_UNSCOPED_IDENTITY_RECORD_ID,
} from "../constants/crypto.constants";
import type { StoredIdentityRecord, RemoteDeviceKey } from "../types/crypto.types";

function assertBrowserEnvironment(): void {
  if (typeof indexedDB === "undefined") {
    throw new Error(
      "Secure storage requires a browser environment with IndexedDB support (this code must not run server-side).",
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
        if (!db.objectStoreNames.contains(STORE_IDENTITY)) {
          db.createObjectStore(STORE_IDENTITY, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_DEVICE_KEYS)) {
          db.createObjectStore(STORE_DEVICE_KEYS, { keyPath: "deviceId" });
        }
        if (!db.objectStoreNames.contains(STORE_SESSION_METADATA)) {
          db.createObjectStore(STORE_SESSION_METADATA, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open secure storage database"));
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
  const store = tx.objectStore(storeName);
  return runRequest(fn(store));
}

export async function saveIdentityRecord(record: StoredIdentityRecord): Promise<void> {
  await withStore(STORE_IDENTITY, "readwrite", (store) => store.put(record));
}

export async function getIdentityRecord(
  recordId: string,
): Promise<StoredIdentityRecord | undefined> {
  return withStore(STORE_IDENTITY, "readonly", (store) => store.get(recordId));
}

export async function deleteIdentityRecord(recordId: string): Promise<void> {
  await withStore(STORE_IDENTITY, "readwrite", (store) => store.delete(recordId));
}

/**
 * One-time migration for identities created before per-account scoping
 * existed: if this device still has an identity sitting under the OLD
 * fixed, unscoped row (`LEGACY_UNSCOPED_IDENTITY_RECORD_ID`), moves it to
 * `newRecordId` (the caller's scoped id) and removes the legacy row, so
 * the account that already unlocked it once doesn't get treated as
 * first-time and orphaned from its real identity.
 *
 * Best-effort and intentionally narrow: it only runs when a scoped
 * lookup already came back empty (see key-manager.service.ts's
 * `getOwnIdentityRecord`), and it only ever moves a record — it never
 * invents one. On a device where the legacy row belonged to a DIFFERENT
 * account than the one now checking, this hands that account someone
 * else's identity record; that's an accepted, unavoidable consequence of
 * the old design never having recorded which account a legacy identity
 * belonged to, and only matters for a device that (a) predates this fix
 * and (b) had more than one account use it — the same multi-account
 * collision this fix exists to prevent going forward, just for one
 * unavoidable last migration instead of forever.
 */
export async function migrateLegacyIdentityRecord(
  newRecordId: string,
): Promise<StoredIdentityRecord | undefined> {
  const legacy = await getIdentityRecord(LEGACY_UNSCOPED_IDENTITY_RECORD_ID);
  if (!legacy) return undefined;

  const migrated: StoredIdentityRecord = { ...legacy, id: newRecordId };
  await saveIdentityRecord(migrated);
  await deleteIdentityRecord(LEGACY_UNSCOPED_IDENTITY_RECORD_ID);
  return migrated;
}

// --- Remote device/contact public keys ------------------------------------

export async function saveDeviceKey(key: RemoteDeviceKey): Promise<void> {
  await withStore(STORE_DEVICE_KEYS, "readwrite", (store) => store.put(key));
}

export async function getDeviceKey(deviceId: string): Promise<RemoteDeviceKey | undefined> {
  return withStore(STORE_DEVICE_KEYS, "readonly", (store) => store.get(deviceId));
}

export async function getAllDeviceKeys(): Promise<RemoteDeviceKey[]> {
  return withStore(STORE_DEVICE_KEYS, "readonly", (store) => store.getAll());
}

export async function deleteDeviceKey(deviceId: string): Promise<void> {
  await withStore(STORE_DEVICE_KEYS, "readwrite", (store) => store.delete(deviceId));
}

// --- Generic session metadata (last-sync cursor, key version, etc.) ------

export async function setSessionMetadata(key: string, value: unknown): Promise<void> {
  await withStore(STORE_SESSION_METADATA, "readwrite", (store) =>
    store.put({ key, value, updatedAt: new Date().toISOString() }),
  );
}

export async function getSessionMetadata<T = unknown>(key: string): Promise<T | undefined> {
  const record = await withStore<{ key: string; value: T; updatedAt: string } | undefined>(
    STORE_SESSION_METADATA,
    "readonly",
    (store) => store.get(key),
  );
  return record?.value;
}

export async function deleteSessionMetadata(key: string): Promise<void> {
  await withStore(STORE_SESSION_METADATA, "readwrite", (store) => store.delete(key));
}

/** Wipes all locally stored key material and metadata — e.g. on explicit logout or "forget this device". */
export async function clearAllSecureStorage(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(
    [STORE_IDENTITY, STORE_DEVICE_KEYS, STORE_SESSION_METADATA],
    "readwrite",
  );
  tx.objectStore(STORE_IDENTITY).clear();
  tx.objectStore(STORE_DEVICE_KEYS).clear();
  tx.objectStore(STORE_SESSION_METADATA).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear secure storage"));
  });
}
