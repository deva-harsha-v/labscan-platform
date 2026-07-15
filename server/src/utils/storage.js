import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

let client;

export function isStorageConfigured() {
  return Boolean(env.storage.accessKeyId && env.storage.secretAccessKey && env.storage.bucket);
}

function getClient() {
  if (!isStorageConfigured()) {
    return null;
  }
  if (!client) {
    client = new S3Client({
      region: env.storage.region,
      ...(env.storage.endpoint ? { endpoint: env.storage.endpoint } : {}),
      forcePathStyle: env.storage.forcePathStyle,
      credentials: {
        accessKeyId: env.storage.accessKeyId,
        secretAccessKey: env.storage.secretAccessKey,
      },
    });
  }
  return client;
}

/**
 * Generate a short-lived signed GET URL for a stored object key.
 * URLs are generated on demand and never persisted.
 */
export async function getSignedDownloadUrl(storageKey) {
  const c = getClient();
  if (!c) return null;
  const command = new GetObjectCommand({ Bucket: env.storage.bucket, Key: storageKey });
  return getSignedUrl(c, command, { expiresIn: env.storage.signedUrlTtlSeconds });
}

/**
 * Generate a short-lived signed PUT URL for uploading media (admin only).
 */
export async function getSignedUploadUrl(storageKey, contentType) {
  const c = getClient();
  if (!c) return null;
  const command = new PutObjectCommand({
    Bucket: env.storage.bucket,
    Key: storageKey,
    ...(contentType ? { ContentType: contentType } : {}),
  });
  return getSignedUrl(c, command, { expiresIn: env.storage.signedUrlTtlSeconds });
}
