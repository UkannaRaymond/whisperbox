import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { createLogger } from "@/server/logger";

const log = createLogger("storage");

declare global {
  var __r2Client: S3Client | undefined;
}

const UPLOAD_URL_TTL_SECONDS = 300;
const DOWNLOAD_URL_TTL_SECONDS = 300;

function getClient(): S3Client {
  if (globalThis.__r2Client) return globalThis.__r2Client;

  if (
    !env.AWS_ENDPOINT_URL_S3 ||
    !env.AWS_ACCESS_KEY_ID ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !env.AWS_REGION
  ) {
    throw new Error(
      "Neon Object Storage is not configured — AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_ENDPOINT_URL_S3/AWS_REGION must be set to use attachments",
    );
  }

  const client = new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__r2Client = client;
  }

  return client;
}

function requireBucket(): string {
  if (!env.R2_BUCKET) {
    throw new Error("R2_BUCKET is not configured — attachments are unavailable");
  }

  return env.R2_BUCKET;
}

/**
 * Generates a fresh, collision-proof object key for a new upload,
 * namespaced by the uploading user.
 */
export function generateStorageKey(userId: string, extension?: string): string {
  const suffix = extension ? `.${extension.replace(/^\./, "")}` : "";

  return `attachments/${userId}/${randomUUID()}${suffix}`;
}

/**
 * A presigned PUT URL the client uploads the (already client-side
 * encrypted) file bytes to directly — the server's own request body size
 * limits never see the file, and the server itself never holds the bytes
 * in memory either.
 */
export async function getUploadUrl(
  storageKey: string,
  contentType: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: requireBucket(),
    Key: storageKey,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return {
    url,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  };
}

/**
 * A presigned GET URL for downloading a stored
 * (still-encrypted) attachment blob.
 */
export async function getDownloadUrl(
  storageKey: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const client = getClient();

  const command = new GetObjectCommand({
    Bucket: requireBucket(),
    Key: storageKey,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });

  return {
    url,
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
  };
}

export async function deleteObject(storageKey: string): Promise<void> {
  const client = getClient();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: requireBucket(),
        Key: storageKey,
      }),
    );
  } catch (error) {
    log.error({ error, storageKey }, "Failed to delete object from Neon Object Storage");

    throw error;
  }
}
