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

/**
 * Generates a new RSA-OAEP-4096 identity keypair (07-CRYPTOGRAPHY.md § Key
 * Lifecycle, step 1: "Generate RSA keypair on first login").
 *
 * Key usages are `wrapKey`/`unwrapKey`, not `encrypt`/`decrypt` — this
 * keypair is only ever used to wrap/unwrap AES content keys
 * (`wrapContentKey`/`unwrapContentKey` below), never to encrypt arbitrary
 * data directly. Per the Web Crypto spec these are distinct usages even
 * though RSA-OAEP's `wrapKey` is implemented as export-then-encrypt
 * internally — passing `encrypt`/`decrypt` here instead throws
 * `InvalidAccessError` at the `wrapKey()`/`unwrapKey()` call site (caught
 * by an actual runtime test while building this, not just inferred from
 * the docs).
 *
 * The private key is generated `extractable: true`. This is a deliberate,
 * necessary tradeoff, not an oversight: a non-extractable CryptoKey cannot
 * be persisted at all (it only lives for the lifetime of that in-memory
 * object), so the private key must be exportable at least once, at
 * generation time, in order for key-manager.service.ts to encrypt it and
 * write it to IndexedDB for use across sessions. It is never persisted or
 * transmitted in this extractable/raw form — see
 * key-manager.service.ts#generateAndPersistIdentity.
 */
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
 * (07-CRYPTOGRAPHY.md § Key Lifecycle, step 5: "AES key encrypted for each
 * recipient"). Uses Web Crypto's native `wrapKey`, which exports the AES
 * key internally and RSA-OAEP-encrypts the raw bytes in one call — the raw
 * AES key material never exists as a separate JS value the caller has to
 * handle.
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

/**
 * Full sender-side flow for one message (07-CRYPTOGRAPHY.md § Message
 * Flow: "Sender → Encrypt → Upload ciphertext"): generate a fresh AES key,
 * encrypt the plaintext with it, and wrap that key for every recipient.
 *
 * `recipients` should be exactly the set of recipient USERS the message is
 * for — not one entry per device. See the multi-device limitation noted in
 * the server-side `EncryptedMessageKey` model
 * (repositories/interfaces/message.repository.interface.ts): today's
 * schema can only store one wrapped copy per recipient user, so wrapping
 * per-device here would produce keys the server has nowhere to persist
 * past the first one for each user.
 */
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
 * (07-CRYPTOGRAPHY.md § Message Flow: "Recipient → Download → Decrypt
 * locally").
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
