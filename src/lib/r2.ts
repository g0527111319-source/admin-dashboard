import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "zirat-files";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// S3-compatible client for Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  return {
    key,
    url: `${R2_PUBLIC_URL}/${key}`,
    size: buffer.length,
    contentType,
  };
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  await r2Client.send(command);
}

/**
 * Get a file from R2
 */
export async function getFromR2(key: string) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return r2Client.send(command);
}

/**
 * Generate a unique key for a file
 */
export function generateFileKey(
  folder: string,
  fileName: string,
  designerId?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 100);

  const parts = [folder];
  if (designerId) parts.push(designerId);
  parts.push(`${timestamp}-${random}-${safeName}`);

  return parts.join("/");
}

/**
 * Get the public URL for a file key
 */
export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Allowed file types and their limits
 */
export const FILE_LIMITS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  },
  document: {
    maxSize: 25 * 1024 * 1024, // 25MB
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ],
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
  },
  any: {
    maxSize: 50 * 1024 * 1024, // 50MB
    types: [] as string[],  // allow any type
    extensions: [] as string[],
  },
} as const;

export type FileCategory = keyof typeof FILE_LIMITS;

/**
 * Validate a file before upload
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  contentType: string,
  category: FileCategory = "any"
): { valid: boolean; error?: string } {
  const limits = FILE_LIMITS[category];

  if (fileSize > limits.maxSize) {
    const maxMB = Math.round(limits.maxSize / 1024 / 1024);
    return { valid: false, error: `הקובץ גדול מדי. מקסימום ${maxMB}MB` };
  }

  if (limits.types.length > 0 && !(limits.types as readonly string[]).includes(contentType)) {
    return { valid: false, error: `סוג קובץ לא נתמך: ${contentType}` };
  }

  return { valid: true };
}
