/**
 * ArrayBuffer <-> base64 helpers. Web Crypto API works in `ArrayBuffer`/
 * `Uint8Array`; everything that needs to cross a JSON boundary (API
 * payloads, IndexedDB records meant to stay plain-JSON-serializable) or be
 * displayed as text uses base64 strings instead.
 */

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

export function bufferToText(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Some TypeScript/lib.dom.d.ts versions type `crypto.subtle.*`'s
 * `BufferSource` parameters as requiring a `Uint8Array<ArrayBuffer>`
 * specifically, which the plain `Uint8Array` returned by
 * `crypto.getRandomValues(new Uint8Array(n))` (or constructed from an
 * `ArrayBuffer` elsewhere in this module) doesn't structurally satisfy in
 * those versions — it's typed as `Uint8Array<ArrayBufferLike>`, which also
 * permits `SharedArrayBuffer`. This is purely a type-checking artifact:
 * the underlying bytes are identical either way, and every affected
 * TypeScript version executes the same correct code at runtime. This
 * project's own `typescript@^5.6.2` range can resolve to a patch version
 * on either side of where this got stricter, so callers use this helper
 * at the `crypto.subtle` call boundary rather than depending on exactly
 * which patch a fresh `npm install` happens to pick.
 */
export function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}
