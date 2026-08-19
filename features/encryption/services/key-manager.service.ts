import {
  PBKDF2_HASH,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_LENGTH_BYTES,
  IDENTITY_RECORD_ID,
} from "../constants/crypto.constants";
import { bufferToBase64, base64ToBuffer, textToBuffer, toBufferSource } from "../utils/base64";
import { computeFingerprint } from "../utils/fingerprint";
import * as CryptoService from "./crypto.service";
import * as SecureStorage from "./secure-storage";
import type { PublicIdentity, RemoteDeviceKey, StoredIdentityRecord } from "../types/crypto.types";

/**
 * KeyManager — device key management and the "first login" identity
 * lifecycle (07-CRYPTOGRAPHY.md § Key Lifecycle, § Client Storage,
 * § Deliverables: "Key manager", "Device key management").
 *
 * ## Why this doesn't use the server's IdentityKey/SignedPreKey/OneTimePreKey tables
 * prisma/schema.prisma has a second, unrelated key-bundle design
 * (`UserKeyBundle` / `IdentityKey` / `SignedPreKey` / `OneTimePreKey`,
 * defaulting to the `X25519` algorithm) modeled after Signal's X3DH
 * protocol. That is a different, more sophisticated key-agreement scheme
 * (forward secrecy via ephemeral/one-time keys) than what
 * 07-CRYPTOGRAPHY.md and Prompt-07 actually specify — RSA-OAEP-4096 key
 * exchange with per-message AES key wrapping, no ratcheting. This module
 * implements exactly what was asked (RSA-OAEP), and stores/uploads its
 * public key through the `Device` model's own `devicePublicKey` /
 * `fingerprint` columns instead, which are the correct fit for a
 * one-keypair-per-device design. The X3DH tables are simply unused by this
 * implementation; reconciling which of the two designs WhisperBox actually
 * wants is a product/architecture decision, not something to silently
 * pick a side on here.
 *
 * ## The private key never leaves this module unencrypted
 * `unlockIdentity()` returns a `CryptoKey` held only in memory for the
 * current session — callers should keep it in memory (e.g. a module-level
 * variable or state store) for as long as the session lasts and let it be
 * garbage collected on logout/tab close, not persist it anywhere
 * themselves. The only persisted form is the PBKDF2-encrypted blob in
 * IndexedDB (see secure-storage.ts).
 */

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

export async function hasStoredIdentity(): Promise<boolean> {
  const record = await SecureStorage.getIdentityRecord();
  return record !== undefined;
}

/**
 * Returns the current device's public identity (public key + fingerprint)
 * without needing the passphrase — none of this is secret. Returns null if
 * no identity has been generated yet.
 */
export async function getPublicIdentity(): Promise<PublicIdentity | null> {
  const record = await SecureStorage.getIdentityRecord();
  if (!record) return null;
  return {
    publicKeySpki: record.publicKeySpki,
    fingerprint: record.fingerprint,
    createdAt: record.createdAt,
  };
}

/**
 * First-login entry point (07-CRYPTOGRAPHY.md § Key Lifecycle, step 1-3):
 * if this device already has a stored identity, returns it as-is. If not,
 * generates a new RSA-OAEP-4096 keypair, encrypts the private key with a
 * PBKDF2-derived key from `passphrase`, and persists it. Returns the
 * public identity — the caller (an "action"/API-call layer, out of scope
 * here) is responsible for uploading `publicKeySpki`/`fingerprint` to the
 * server's `Device.devicePublicKey`/`Device.fingerprint` columns.
 */
export async function initializeIdentity(passphrase: string): Promise<PublicIdentity> {
  const existing = await getPublicIdentity();
  if (existing) return existing;

  return generateAndPersistIdentity(passphrase);
}

/**
 * Forces generation of a brand new identity keypair, replacing any
 * existing one (07-CRYPTOGRAPHY.md § Security: "Forward compatibility for
 * key rotation").
 *
 * This does NOT re-encrypt or migrate any messages/attachments already
 * wrapped under the old public key — those remain readable only via the
 * old private key. A full rotation flow (re-wrapping in-flight content,
 * notifying contacts, revoking the old device key server-side) is a
 * larger feature than "generate a new keypair" and is out of scope here;
 * this function only handles the client-side key-generation half of it.
 */
export async function rotateIdentityKeyPair(passphrase: string): Promise<PublicIdentity> {
  return generateAndPersistIdentity(passphrase);
}

async function generateAndPersistIdentity(passphrase: string): Promise<PublicIdentity> {
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
    id: IDENTITY_RECORD_ID,
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

/**
 * Decrypts and returns this device's private key for use in the current
 * session, given the passphrase it was encrypted with. Throws if there is
 * no stored identity, or if the passphrase is wrong (AES-GCM's auth tag
 * check fails, distinguishable from "not found" by the error thrown).
 */
export async function unlockIdentity(passphrase: string): Promise<CryptoKey> {
  const record = await SecureStorage.getIdentityRecord();
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

/** Wipes the stored identity (and everything else in secure storage) — "forget this device" / explicit logout. */
export async function forgetDevice(): Promise<void> {
  await SecureStorage.clearAllSecureStorage();
}

// --- Remote device/contact key management ---------------------------------

/**
 * Caches a remote device's public key locally (e.g. fetched from
 * `Device.devicePublicKey` for a conversation participant), so it can be
 * used to encrypt to them without re-fetching every time. Newly cached
 * keys start untrusted — call `markDeviceTrusted` once the user has
 * confirmed the fingerprint out-of-band.
 */
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
  forgetDevice,
  cacheRemoteDeviceKey,
  getRemoteDeviceKey,
  listKnownDeviceKeys,
  markDeviceTrusted,
  forgetRemoteDeviceKey,
};
