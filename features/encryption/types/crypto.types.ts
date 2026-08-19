/**
 * Shared types for the client-side encryption feature.
 * (07-CRYPTOGRAPHY.md § Deliverables: CryptoService, Key manager,
 * Encryption/Decryption helpers, Secure storage.)
 */

/** An RSA-OAEP-4096 keypair, plus the SHA-256 fingerprint of the public key. */
export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  /** Hex-encoded SHA-256 fingerprint of the public key — for device verification / key comparison. */
  fingerprint: string;
  createdAt: Date;
}

/** The subset of an identity keypair safe to hand to UI/network code — no CryptoKey objects, no private material. */
export interface PublicIdentity {
  /** Base64-encoded SPKI-format public key, ready to upload/display. */
  publicKeySpki: string;
  fingerprint: string;
  createdAt: string;
}

/** AES-256-GCM ciphertext plus the nonce it was encrypted with. Both are required to decrypt. */
export interface AesEncryptedPayload {
  /** Base64-encoded ciphertext (Web Crypto appends the GCM auth tag to this automatically). */
  ciphertext: string;
  /** Base64-encoded 96-bit nonce. Never reuse a nonce with the same key. */
  nonce: string;
}

/** An AES-256-GCM key wrapped (RSA-OAEP-encrypted) for one specific recipient. */
export interface WrappedKey {
  recipientId: string;
  /** Base64-encoded RSA-OAEP ciphertext of the raw AES key. */
  wrappedKey: string;
  algorithm: "RSA-OAEP-4096";
}

/** Everything needed to send an encrypted message to N recipients: the ciphertext, and one wrapped key per recipient. */
export interface EncryptedMessagePayload extends AesEncryptedPayload {
  encryptionVersion: number;
  wrappedKeys: WrappedKey[];
}

/** A remote party's public key, cached locally for encrypting to them and for device verification. */
export interface RemoteDeviceKey {
  deviceId: string;
  /** Base64-encoded SPKI-format public key. */
  publicKeySpki: string;
  fingerprint: string;
  /** Set once the local user has confirmed this fingerprint out-of-band (07-CRYPTOGRAPHY.md: "Key fingerprint comparison"). */
  trusted: boolean;
  addedAt: string;
}

/** Encrypted-at-rest private key record, as stored in IndexedDB. Never contains the raw private key. */
export interface StoredIdentityRecord {
  id: string;
  publicKeySpki: string;
  fingerprint: string;
  /** Base64-encoded AES-GCM ciphertext of the exported PKCS#8 private key. */
  encryptedPrivateKey: string;
  /** Base64-encoded nonce for `encryptedPrivateKey`. */
  privateKeyNonce: string;
  /** Base64-encoded PBKDF2 salt used to derive the key that encrypts `encryptedPrivateKey`. */
  kdfSalt: string;
  kdfIterations: number;
  createdAt: string;
}
