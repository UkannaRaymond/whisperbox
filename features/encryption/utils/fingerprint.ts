import { FINGERPRINT_HASH } from "../constants/crypto.constants";

/**
 * SHA-256 fingerprint of a public key, for device verification / key
 * comparison (07-CRYPTOGRAPHY.md § Security). Formatted as lowercase hex,
 * grouped in 4-character blocks, so two people can read it aloud or
 * compare it visually without transcription errors — the same rationale
 * behind Signal's "safety numbers" and PGP fingerprint formatting.
 */
export async function computeFingerprint(publicKeySpkiBuffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest(FINGERPRINT_HASH, publicKeySpkiBuffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return groupHex(hex);
}

function groupHex(hex: string, groupSize = 4): string {
  const groups: string[] = [];
  for (let i = 0; i < hex.length; i += groupSize) {
    groups.push(hex.slice(i, i + groupSize));
  }
  return groups.join(" ");
}

/**
 * Length-leak-free-ish comparison for two fingerprint strings, for use in
 * "confirm this matches what your contact sees" verification flows.
 * (Fingerprints aren't secret, so this isn't a timing-attack defense in the
 * cryptographic sense — it just avoids the sloppy pattern of an early-exit
 * loop giving a falsely reassuring "getting warmer" signal in a UI.)
 */
export function fingerprintsMatch(a: string, b: string): boolean {
  const normalizedA = a.replace(/\s/g, "").toLowerCase();
  const normalizedB = b.replace(/\s/g, "").toLowerCase();
  if (normalizedA.length !== normalizedB.length) return false;

  let mismatch = 0;
  for (let i = 0; i < normalizedA.length; i++) {
    mismatch |= normalizedA.charCodeAt(i) ^ normalizedB.charCodeAt(i);
  }
  return mismatch === 0;
}
