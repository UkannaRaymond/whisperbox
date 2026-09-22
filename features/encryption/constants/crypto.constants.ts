export const RSA_OAEP_MODULUS_LENGTH = 4096;
export const RSA_OAEP_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537
export const RSA_OAEP_HASH = "SHA-256";

export const AES_GCM_KEY_LENGTH = 256;
// 96 bits — the length NIST SP 800-38D recommends for GCM nonces; using a
// different length is permitted by the spec but forces a slower internal
// derivation step and offers no benefit here.
export const AES_GCM_IV_LENGTH_BYTES = 12;

export const PBKDF2_HASH = "SHA-256";
export const PBKDF2_ITERATIONS = 600_000; // OWASP (2023) minimum for PBKDF2-HMAC-SHA256
export const PBKDF2_SALT_LENGTH_BYTES = 16;

export const FINGERPRINT_HASH = "SHA-256";

// IndexedDB layout.
export const DB_NAME = "whisperbox-crypto";
export const DB_VERSION = 1;

export const STORE_IDENTITY = "identity"; // this device's own keypair (private key encrypted at rest)
export const STORE_DEVICE_KEYS = "deviceKeys"; // known public keys of other devices/contacts
export const STORE_SESSION_METADATA = "sessionMetadata"; // generic key/value metadata (last sync cursor, etc.)

/** Prefix for the new per-account scoped record id (`${IDENTITY_RECORD_PREFIX}:${userId}`) — see key-manager.service.ts's `identityRecordId`. Deliberately a different constant from `LEGACY_UNSCOPED_IDENTITY_RECORD_ID` below, even though they happen to share the same string, so the two meanings ("the whole legacy row's id" vs. "the new scheme's prefix") can't be silently conflated if either ever needs to change independently. */
export const IDENTITY_RECORD_PREFIX = "identity";

export const LEGACY_UNSCOPED_IDENTITY_RECORD_ID = "identity";
