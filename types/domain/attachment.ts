/**
 * A message attachment stored, encrypted, in object storage (Cloudflare
 * R2). `storageKey` is a reference into that bucket, never a public URL —
 * access is mediated by a signed/authorized download, implemented in the
 * Attachments phase.
 */
export interface Attachment {
  id: string;
  messageId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}
