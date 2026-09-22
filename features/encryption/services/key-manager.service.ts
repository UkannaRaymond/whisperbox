import {
  PBKDF2_HASH,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_LENGTH_BYTES,
  IDENTITY_RECORD_PREFIX,
} from "../constants/crypto.constants";
import { bufferToBase64, base64ToBuffer, textToBuffer, toBufferSource } from "../utils/base64";
import { computeFingerprint } from "../utils/fingerprint";
import * as CryptoService from "./crypto.service";
import * as SecureStorage from "./secure-storage";
import type { PublicIdentity, RemoteDeviceKey, StoredIdentityRecord } from "../types/crypto.types";

// --- Passphrase-derived storage key (PBKDF2) ------------------------------

async function derivePbkdf2Key(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", textToBuffer(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toBufferSource(salt), iterations, hash: PBKDF2_HASH },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// --- Identity lifecycle ----------------------------------------------------

function identityRecordId(userId: string): string {
  return `${IDENTITY_RECORD_PREFIX}:${userId}`;
}

async function getOwnIdentityRecord(userId: string): Promise<StoredIdentityRecord | undefined> {
  const scopedId = identityRecordId(userId);
  return SecureStorage.getIdentityRecord(scopedId);
}

export async function hasStoredIdentity(userId: string): Promise<boolean> {
  const record = await getOwnIdentityRecord(userId);
  return record !== undefined;
}

export async function getPublicIdentity(userId: string): Promise<PublicIdentity | null> {
  const record = await getOwnIdentityRecord(userId);
  if (!record) return null;
  return {
    publicKeySpki: record.publicKeySpki,
    fingerprint: record.fingerprint,
    createdAt: record.createdAt,
  };
}

export async function initializeIdentity(
  userId: string,
  passphrase: string,
): Promise<PublicIdentity> {
  const existing = await getPublicIdentity(userId);
  if (existing) return existing;

  return generateAndPersistIdentity(userId, passphrase);
}

export async function rotateIdentityKeyPair(
  userId: string,
  passphrase: string,
): Promise<PublicIdentity> {
  return generateAndPersistIdentity(userId, passphrase);
}

async function generateAndPersistIdentity(
  userId: string,
  passphrase: string,
): Promise<PublicIdentity> {
  const keyPair = await CryptoService.generateIdentityKeyPair();

  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH_BYTES));
  const storageKey = await derivePbkdf2Key(passphrase, salt, PBKDF2_ITERATIONS);

  const privateKeyPkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    storageKey,
    privateKeyPkcs8,
  );

  const publicKeySpki = await crypto.subtle.exportKey("spki", keyPair.publicKey);

  const record: StoredIdentityRecord = {
    id: identityRecordId(userId),
    publicKeySpki: bufferToBase64(publicKeySpki),
    fingerprint: keyPair.fingerprint,
    encryptedPrivateKey: bufferToBase64(encryptedPrivateKey),
    privateKeyNonce: bufferToBase64(iv),
    kdfSalt: bufferToBase64(salt),
    kdfIterations: PBKDF2_ITERATIONS,
    createdAt: keyPair.createdAt.toISOString(),
  };

  await SecureStorage.saveIdentityRecord(record);

  return {
    publicKeySpki: record.publicKeySpki,
    fingerprint: record.fingerprint,
    createdAt: record.createdAt,
  };
}

export async function unlockIdentity(userId: string, passphrase: string): Promise<CryptoKey> {
  const record = await getOwnIdentityRecord(userId);
  if (!record) {
    throw new Error(
      "No identity keypair exists on this device yet — call initializeIdentity() first.",
    );
  }

  const salt = new Uint8Array(base64ToBuffer(record.kdfSalt));
  const storageKey = await derivePbkdf2Key(passphrase, salt, record.kdfIterations);

  const iv = new Uint8Array(base64ToBuffer(record.privateKeyNonce));
  const encryptedPrivateKey = base64ToBuffer(record.encryptedPrivateKey);

  let privateKeyPkcs8: ArrayBuffer;
  try {
    privateKeyPkcs8 = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      storageKey,
      encryptedPrivateKey,
    );
  } catch {
    throw new Error("Incorrect passphrase — could not decrypt the stored private key.");
  }

  return CryptoService.importPrivateKey(privateKeyPkcs8);
}

export async function forgetIdentity(userId: string): Promise<void> {
  await SecureStorage.deleteIdentityRecord(identityRecordId(userId));
}

/** Wipes the stored identity (and everything else in secure storage) — "forget this device" / explicit logout. Affects EVERY account's identity on this device, not just one — see `forgetIdentity` for the single-account version. */
export async function forgetDevice(): Promise<void> {
  await SecureStorage.clearAllSecureStorage();
}

// --- Remote device/contact key management ---------------------------------

export async function cacheRemoteDeviceKey(
  deviceId: string,
  publicKeySpkiBase64: string,
): Promise<RemoteDeviceKey> {
  const spki = base64ToBuffer(publicKeySpkiBase64);
  const fingerprint = await computeFingerprint(spki);

  const existing = await SecureStorage.getDeviceKey(deviceId);

  const record: RemoteDeviceKey = {
    deviceId,
    publicKeySpki: publicKeySpkiBase64,
    fingerprint,
    trusted: existing?.trusted ?? false,
    addedAt: existing?.addedAt ?? new Date().toISOString(),
  };

  await SecureStorage.saveDeviceKey(record);
  return record;
}

export async function getRemoteDeviceKey(deviceId: string): Promise<RemoteDeviceKey | undefined> {
  return SecureStorage.getDeviceKey(deviceId);
}

export async function listKnownDeviceKeys(): Promise<RemoteDeviceKey[]> {
  return SecureStorage.getAllDeviceKeys();
}

/** Marks a cached device key as verified (07-CRYPTOGRAPHY.md: "Key fingerprint comparison") — call after the user confirms the fingerprint matches out-of-band. */
export async function markDeviceTrusted(deviceId: string): Promise<void> {
  const existing = await SecureStorage.getDeviceKey(deviceId);
  if (!existing)
    throw new Error(`No cached key for device ${deviceId} — cache it before marking it trusted.`);
  await SecureStorage.saveDeviceKey({ ...existing, trusted: true });
}

export async function forgetRemoteDeviceKey(deviceId: string): Promise<void> {
  await SecureStorage.deleteDeviceKey(deviceId);
}

/** Grouped export matching the "Key manager" deliverable name (07-CRYPTOGRAPHY.md § Deliverables). */
export const KeyManager = {
  hasStoredIdentity,
  getPublicIdentity,
  initializeIdentity,
  rotateIdentityKeyPair,
  unlockIdentity,
  forgetIdentity,
  forgetDevice,
  cacheRemoteDeviceKey,
  getRemoteDeviceKey,
  listKnownDeviceKeys,
  markDeviceTrusted,
  forgetRemoteDeviceKey,
};
