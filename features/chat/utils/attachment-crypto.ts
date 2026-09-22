import { bufferToBase64 } from "@/features/encryption/utils/base64";
import * as CryptoService from "@/features/encryption/services/crypto.service";
import { AES_GCM_IV_LENGTH_BYTES } from "@/features/encryption/constants/crypto.constants";
import type { MessageResponseDto } from "@/schemas/message.schema";
import type { AttachmentResponseDto, CreateAttachmentDto } from "@/schemas/attachment.schema";

/**
 * Attachment envelope encryption — implements the design inferred (and
 * flagged as such) in
 * repositories/interfaces/attachment.repository.interface.ts's doc
 * comment on `CreateAttachmentInput`: the file gets its own one-time
 * AES-256-GCM key, and THAT key is itself AES-GCM-encrypted under the
 * parent message's already-per-recipient-wrapped content key — not
 * wrapped per-recipient again. Any recipient who can already decrypt the
 * message (features/encryption/services/crypto.service.ts
 * #decryptFromPayload) can therefore derive the attachment key too,
 * without a second RSA-wrapping round trip or its own
 * `EncryptedMessageKey`-style table.
 */
export interface EncryptedAttachmentFile {
  /** Encrypted file bytes, ready to PUT to the presigned upload URL. */
  encryptedBlob: Blob;
  /** base64 AES-GCM ciphertext of the raw file key, wrapped under the message content key — `Attachment.encryptedKey`. */
  wrappedFileKey: string;
  /** base64 nonce for `wrappedFileKey` — `Attachment.nonce`. Distinct from the file's own content nonce. */
  wrappedFileKeyNonce: string;
  /** base64 SHA-256 of the ENCRYPTED bytes — lets a recipient verify the download wasn't corrupted/tampered with before attempting to decrypt it. */
  checksum: string;
}

/** Encrypts a file for upload, given the CryptoKey already used to encrypt the parent message's text content. */
export async function encryptAttachmentFile(
  file: File,
  messageContentKey: CryptoKey,
): Promise<EncryptedAttachmentFile> {
  const fileKey = await CryptoService.generateContentKey();
  const rawBytes = await file.arrayBuffer();
  const { ciphertext, nonce: fileNonce } = await CryptoService.encryptBytes(rawBytes, fileKey);

  // The file's own nonce travels WITH the ciphertext bytes (prepended) so
  // a single presigned-URL blob is everything a recipient needs to
  // decrypt it, without a separate metadata fetch for just the nonce.
  const nonceBytes = new Uint8Array(base64ToRaw(fileNonce));
  const ciphertextBytes = new Uint8Array(base64ToRaw(ciphertext));
  const combined = new Uint8Array(nonceBytes.byteLength + ciphertextBytes.byteLength);
  combined.set(nonceBytes, 0);
  combined.set(ciphertextBytes, nonceBytes.byteLength);

  const exportedFileKey = await crypto.subtle.exportKey("raw", fileKey);
  const wrapped = await CryptoService.encryptBytes(exportedFileKey, messageContentKey);

  const checksumDigest = await crypto.subtle.digest("SHA-256", combined);

  return {
    encryptedBlob: new Blob([combined], { type: "application/octet-stream" }),
    wrappedFileKey: wrapped.ciphertext,
    wrappedFileKeyNonce: wrapped.nonce,
    checksum: bufferToBase64(checksumDigest),
  };
}

function base64ToRaw(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Maps a MIME type to the closest MessageType/AttachmentType — used to pick both the message's `type` and the attachment's `type`. */
export function classifyMimeType(mimeType: string): {
  messageType: MessageResponseDto["type"];
  attachmentType: CreateAttachmentDto["type"];
} {
  if (mimeType.startsWith("image/")) return { messageType: "IMAGE", attachmentType: "IMAGE" };
  if (mimeType.startsWith("video/")) return { messageType: "VIDEO", attachmentType: "VIDEO" };
  if (mimeType.startsWith("audio/")) return { messageType: "AUDIO", attachmentType: "AUDIO" };
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip" ||
    mimeType === "application/x-7z-compressed"
  ) {
    return { messageType: "FILE", attachmentType: "ARCHIVE" };
  }
  if (
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType.startsWith("application/")
  ) {
    return { messageType: "FILE", attachmentType: "DOCUMENT" };
  }
  return { messageType: "FILE", attachmentType: "OTHER" };
}

export type { AttachmentResponseDto };

/**
 * Reverses `encryptAttachmentFile`: unwraps the file's AES key using the
 * message's content key, splits the downloaded blob back into its
 * prepended nonce + ciphertext, and decrypts it. Returns the plaintext
 * file bytes as a `Blob` with the original `mimeType`, ready for a
 * download link or an `<img>`/`<video>` object URL.
 */
export async function decryptAttachmentFile(params: {
  encryptedBytes: ArrayBuffer;
  wrappedFileKey: string;
  wrappedFileKeyNonce: string;
  messageContentKey: CryptoKey;
  mimeType: string;
}): Promise<Blob> {
  const { encryptedBytes, wrappedFileKey, wrappedFileKeyNonce, messageContentKey, mimeType } =
    params;

  const rawFileKeyBuffer = await CryptoService.decryptBytes(
    { ciphertext: wrappedFileKey, nonce: wrappedFileKeyNonce },
    messageContentKey,
  );
  const fileKey = await crypto.subtle.importKey(
    "raw",
    rawFileKeyBuffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );

  const combined = new Uint8Array(encryptedBytes);
  const nonceBytes = combined.slice(0, AES_GCM_IV_LENGTH_BYTES);
  const ciphertextBytes = combined.slice(AES_GCM_IV_LENGTH_BYTES);

  const plaintext = await CryptoService.decryptBytes(
    { ciphertext: bufferToBase64(ciphertextBytes), nonce: bufferToBase64(nonceBytes) },
    fileKey,
  );

  return new Blob([plaintext], { type: mimeType });
}
