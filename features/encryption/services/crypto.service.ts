import {
  RSA_OAEP_MODULUS_LENGTH,
  RSA_OAEP_PUBLIC_EXPONENT,
  RSA_OAEP_HASH,
  AES_GCM_KEY_LENGTH,
  AES_GCM_IV_LENGTH_BYTES,
} from "../constants/crypto.constants";
import { bufferToBase64, base64ToBuffer, textToBuffer, bufferToText } from "../utils/base64";
import { computeFingerprint } from "../utils/fingerprint";
import type {
  IdentityKeyPair,
  PublicIdentity,
  AesEncryptedPayload,
  WrappedKey,
  EncryptedMessagePayload,
} from "../types/crypto.types";

/**
 * CryptoService — RSA-OAEP-4096 key exchange, AES-256-GCM content
 * encryption, and RSA-wrapped AES key exchange (07-CRYPTOGRAPHY.md §
 * Algorithms, § Key Lifecycle). Built entirely on the browser's native
 * Web Crypto API (`crypto.subtle`) — no crypto library dependency.
 *
 * Every function here is a stateless, pure operation on keys/bytes handed
 * to it. Deciding WHEN to generate a keypair, WHERE to persist it, and
 * WHICH recipients to encrypt for is key-manager.service.ts's job, not
 * this module's — keeping the primitives here testable in isolation from
 * storage and orchestration concerns.
 */

const RSA_OAEP_PARAMS: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: RSA_OAEP_MODULUS_LENGTH,
  publicExponent: RSA_OAEP_PUBLIC_EXPONENT,
  hash: RSA_OAEP_HASH,
};

const AES_GCM_PARAMS: AesKeyGenParams = {
  name: "AES-GCM",
  length: AES_GCM_KEY_LENGTH,
};

// --- RSA-OAEP identity keypair --------------------------------------------

export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const keyPair = await crypto.subtle.generateKey(RSA_OAEP_PARAMS, true, ["wrapKey", "unwrapKey"]);

  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const fingerprint = await computeFingerprint(spki);

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    fingerprint,
    createdAt: new Date(),
  };
}

/** Exports a public key to SPKI/base64 — the form used for upload, storage, and display. */
export async function exportPublicKey(publicKey: CryptoKey): Promise<PublicIdentity> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  const fingerprint = await computeFingerprint(spki);
  return {
    publicKeySpki: bufferToBase64(spki),
    fingerprint,
    createdAt: new Date().toISOString(),
  };
}

/** Imports a base64 SPKI-encoded public key (e.g. a recipient's, fetched from the server) for wrapping content keys to them. */
export async function importPublicKey(publicKeySpkiBase64: string): Promise<CryptoKey> {
  const spki = base64ToBuffer(publicKeySpkiBase64);
  return crypto.subtle.importKey("spki", spki, { name: "RSA-OAEP", hash: RSA_OAEP_HASH }, true, [
    "wrapKey",
  ]);
}

/** Imports a PKCS#8-encoded private key (e.g. after decrypting it out of secure storage) for unwrapping content keys addressed to this device. */
export async function importPrivateKey(pkcs8Buffer: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8Buffer,
    { name: "RSA-OAEP", hash: RSA_OAEP_HASH },
    true,
    ["unwrapKey"],
  );
}

// --- AES-256-GCM content encryption ---------------------------------------

/** Generates a fresh, random AES-256-GCM key — intended for exactly one message/attachment (07-CRYPTOGRAPHY.md: "AES session key generated per message"). */
export async function generateContentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES_GCM_PARAMS, true, ["encrypt", "decrypt"]);
}

/** Encrypts raw bytes with AES-256-GCM under a fresh random nonce. Never reuse a (key, nonce) pair. */
export async function encryptBytes(
  plaintext: ArrayBuffer,
  key: CryptoKey,
): Promise<AesEncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    ciphertext: bufferToBase64(ciphertext),
    nonce: bufferToBase64(iv),
  };
}

/** Decrypts an AES-256-GCM payload. Throws if the auth tag doesn't verify (tampered/corrupted ciphertext, or wrong key/nonce). */
export async function decryptBytes(
  payload: AesEncryptedPayload,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(base64ToBuffer(payload.nonce));
  const ciphertext = base64ToBuffer(payload.ciphertext);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

/** Convenience wrapper for text content (messages). Attachments should use `encryptBytes` directly on their file bytes. */
export async function encryptText(plaintext: string, key: CryptoKey): Promise<AesEncryptedPayload> {
  return encryptBytes(textToBuffer(plaintext), key);
}

export async function decryptText(payload: AesEncryptedPayload, key: CryptoKey): Promise<string> {
  const buffer = await decryptBytes(payload, key);
  return bufferToText(buffer);
}

// --- Key wrapping (RSA-OAEP-encrypt the AES key for a recipient) ---------

/**
 * Wraps (RSA-OAEP-encrypts) an AES content key for one recipient
 */
export async function wrapContentKey(
  contentKey: CryptoKey,
  recipientPublicKey: CryptoKey,
  recipientId: string,
): Promise<WrappedKey> {
  const wrapped = await crypto.subtle.wrapKey("raw", contentKey, recipientPublicKey, {
    name: "RSA-OAEP",
  });
  return {
    recipientId,
    wrappedKey: bufferToBase64(wrapped),
    algorithm: "RSA-OAEP-4096",
  };
}

/** Unwraps a wrapped AES content key using this device's own RSA private key. */
export async function unwrapContentKey(
  wrappedKeyBase64: string,
  myPrivateKey: CryptoKey,
): Promise<CryptoKey> {
  const wrapped = base64ToBuffer(wrappedKeyBase64);
  return crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    myPrivateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: AES_GCM_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// --- High-level send/receive flow -----------------------------------------

export async function encryptForRecipients(
  plaintext: string,
  recipients: Array<{ id: string; publicKey: CryptoKey }>,
  encryptionVersion = 1,
): Promise<EncryptedMessagePayload> {
  const contentKey = await generateContentKey();
  const { ciphertext, nonce } = await encryptText(plaintext, contentKey);

  const wrappedKeys = await Promise.all(
    recipients.map((recipient) => wrapContentKey(contentKey, recipient.publicKey, recipient.id)),
  );

  return { ciphertext, nonce, encryptionVersion, wrappedKeys };
}

/**
 * Full recipient-side flow: find this device's wrapped copy of the
 * content key, unwrap it, and decrypt the message
 */
export async function decryptFromPayload(
  payload: EncryptedMessagePayload,
  myUserId: string,
  myPrivateKey: CryptoKey,
): Promise<string> {
  const myWrappedKey = payload.wrappedKeys.find((key) => key.recipientId === myUserId);
  if (!myWrappedKey) {
    throw new Error(
      "No wrapped key found for this recipient — message was not encrypted for this account.",
    );
  }

  const contentKey = await unwrapContentKey(myWrappedKey.wrappedKey, myPrivateKey);
  return decryptText({ ciphertext: payload.ciphertext, nonce: payload.nonce }, contentKey);
}

/** Grouped export matching the "CryptoService" deliverable name (07-CRYPTOGRAPHY.md § Deliverables). */
export const CryptoService = {
  generateIdentityKeyPair,
  exportPublicKey,
  importPublicKey,
  importPrivateKey,
  generateContentKey,
  encryptBytes,
  decryptBytes,
  encryptText,
  decryptText,
  wrapContentKey,
  unwrapContentKey,
  encryptForRecipients,
  decryptFromPayload,
};
