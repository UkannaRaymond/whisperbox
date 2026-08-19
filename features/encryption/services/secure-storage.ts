import {
  DB_NAME,
  DB_VERSION,
  STORE_IDENTITY,
  STORE_DEVICE_KEYS,
  STORE_SESSION_METADATA,
  IDENTITY_RECORD_ID,
} from "../constants/crypto.constants";
import type { StoredIdentityRecord, RemoteDeviceKey } from "../types/crypto.types";

/**
 * IndexedDB-backed secure storage (07-CRYPTOGRAPHY.md § Client Storage:
 * "IndexedDB — Encrypted private key, Device keys, Session metadata").
 *
 * This is a thin, dependency-free wrapper around the native IndexedDB API
 * — no `idb`/`dexie` package was added, since raw IndexedDB is entirely
 * sufficient for three small stores and this avoids pulling in a new
 * dependency for something this bounded.
 *
 * "Secure" here means: the *private key itself* is never stored in plain
 * form (see StoredIdentityRecord — only `encryptedPrivateKey` +
 * `privateKeyNonce` + KDF params are persisted, never a raw exportable
 * private key). IndexedDB itself has no additional OS-level encryption or
 * access control beyond same-origin policy — it is still readable by any
 * script running on this origin (e.g. a successful XSS), which is exactly
 * why the private key is encrypted before it ever reaches this module.
 */

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

// --- Identity keypair (this device's own encrypted private key) ----------

export async function saveIdentityRecord(record: StoredIdentityRecord): Promise<void> {
  await withStore(STORE_IDENTITY, "readwrite", (store) => store.put(record));
}

export async function getIdentityRecord(): Promise<StoredIdentityRecord | undefined> {
  return withStore(STORE_IDENTITY, "readonly", (store) => store.get(IDENTITY_RECORD_ID));
}

export async function deleteIdentityRecord(): Promise<void> {
  await withStore(STORE_IDENTITY, "readwrite", (store) => store.delete(IDENTITY_RECORD_ID));
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
