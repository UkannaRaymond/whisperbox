/**
 * Cryptography constants (07-CRYPTOGRAPHY.md § Algorithms).
 *
 * Algorithm choice notes:
 * - RSA-OAEP 4096 for key exchange/wrapping — matches 07-CRYPTOGRAPHY.md
 *   exactly. This is a different, simpler design than the X3DH-style
 *   (Curve25519/X25519) `IdentityKey`/`SignedPreKey`/`OneTimePreKey` tables
 *   that exist in prisma/schema.prisma — those tables are unused by this
 *   implementation. See the module doc comment in key-manager.service.ts
 *   for the full explanation of that discrepancy.
 * - AES-256-GCM for message/attachment content — authenticated encryption,
 *   so tampering with ciphertext is detected on decrypt rather than
 *   silently producing garbage plaintext.
 * - PBKDF2 (not Argon2id) for deriving the key that encrypts the private
 *   key at rest in IndexedDB. Argon2id has no native Web Crypto API
 *   support — using it client-side means shipping a WASM/asm.js
 *   implementation as a new dependency. PBKDF2-HMAC-SHA256 is natively
 *   supported by `crypto.subtle` in every evergreen browser with zero
 *   added dependencies, so it's used here; the iteration count below
 *   follows OWASP's current PBKDF2-HMAC-SHA256 recommendation. Argon2id
 *   remains the right choice for server-side password hashing (see
 *   lib/auth.ts / lib/password.ts), which is a different threat model.
 */

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

/** Fixed record id for the single identity keypair row — there is only ever one per device. */
export const IDENTITY_RECORD_ID = "identity";
