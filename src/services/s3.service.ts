import { Env } from "@/env";
import { Logger } from "@/utils";
import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: Env.awsRegion,
  credentials: {
    accessKeyId: Env.awsAccessKeyId,
    secretAccessKey: Env.awsSecretAccessKey,
  },
});

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      const backoffMs = 200 * Math.pow(2, attempt - 1);
      Logger.warn(`${label} failed (attempt ${attempt}), retrying in ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }
  throw lastError;
};

const contentTypeFromPath = (filePath: string): string => {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt") || lower.endsWith(".log")) return "text/plain";
  return "application/octet-stream";
};

export const buildS3ObjectKey = (deviceId: string, sourcePath: string): string => {
  const ext = sourcePath.includes(".") ? sourcePath.slice(sourcePath.lastIndexOf(".")) : "";
  return `${deviceId}/${randomUUID()}${ext}`;
};

export const buildS3DownloadPath = (key: string): string =>
  `/api/s3-download?key=${encodeURIComponent(key)}`;

export const uploadBufferToS3 = async (
  key: string,
  body: Buffer,
  sourcePath: string,
): Promise<void> =>
  await withRetry("S3 upload", async () => {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: Env.awsS3Bucket,
        Key: key,
        Body: body,
        ContentType: contentTypeFromPath(sourcePath),
      }),
    );
  });

export const getPresignedDownloadUrl = async (key: string): Promise<string> =>
  await withRetry("S3 presign", async () =>
    getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: Env.awsS3Bucket,
        Key: key,
      }),
      { expiresIn: Env.awsPresignedUrlTtlSeconds },
    ),
  );

export const deleteObjectFromS3 = async (key: string): Promise<void> =>
  await withRetry("S3 delete", async () => {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: Env.awsS3Bucket,
        Key: key,
      }),
    );
  });
