import { createHash } from "node:crypto";
import type { LumiDb } from "@lumi/db";
import { sql } from "drizzle-orm";
import type { StorageConfig, StorageClient } from "@lumi/storage";
import { createWriterClient, putAsset, statObject, ensureBucket } from "@lumi/storage";
import { validateSourceUrl } from "./research.ts";

type AssetConfig = Pick<StorageConfig, "endpoint" | "bucket" | "accessKey" | "secretKey" | "readerAccessKey" | "readerSecretKey" | "assetMaxBytes">;

type AssetUploadInput = {
  courseId: string;
  sourceUrl: string;
  lessonId?: string | null;
  sourceId?: string | null;
  title?: string;
  description?: string;
  altText?: string;
};

type AssetResult = {
  assetId: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
};

const ALLOWED_MIME_TYPES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

const MAX_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB

const detectMimeType = (header: Buffer): string | null => {
  for (const [mime, sig] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (sig.every((byte, i) => header[i] === byte)) return mime;
  }
  return null;
};

const isSvg = (header: Buffer, contentType: string | null): boolean => {
  if (contentType?.includes("svg")) return true;
  const text = header.toString("ascii", 0, Math.min(header.length, 256));
  return /<svg[\s>]/i.test(text) || /<!DOCTYPE\s+svg/i.test(text);
};

const sha256 = (data: Buffer): string => createHash("sha256").update(data).digest("hex");

export const createAssetUploader = (
  db: LumiDb,
  storageConfig: AssetConfig,
  deps?: {
    fetch?: typeof fetch;
    storage?: StorageClient;
    lookup?: typeof import("node:dns/promises").lookup;
  },
) => {
  const fetcher = deps?.fetch ?? globalThis.fetch;
  const lookup = deps?.lookup;
  const writerClient = deps?.storage ?? createWriterClient(storageConfig);

  const validateAndDownload = async (sourceUrl: string): Promise<{ data: Buffer; mimeType: string }> => {
    // SSRF check
    const verdict = await validateSourceUrl(sourceUrl, {
      maxResourceBytes: storageConfig.assetMaxBytes,
      maxRedirects: 3,
      allowedOutboundPorts: [80, 443],
      allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"],
      requestTimeoutMs: 15_000,
      maxCrawlDepth: 0,
      maxPagesPerCrawl: 1,
      maxDiscoveredResources: 1,
    }, lookup);
    if (!verdict.ok) throw new Error(`Blocked asset URL: ${verdict.reason}`);

    const response = await fetcher(sourceUrl, {
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`Asset download failed: ${response.status}`);

    const contentType = response.headers.get("content-type");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > storageConfig.assetMaxBytes) {
      throw new Error(`Asset too large: ${contentLength} bytes (max ${storageConfig.assetMaxBytes})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    if (data.length > storageConfig.assetMaxBytes) {
      throw new Error(`Asset too large: ${data.length} bytes (max ${storageConfig.assetMaxBytes})`);
    }

    // Check for SVG via content sniffing
    if (isSvg(data, contentType)) {
      throw new Error("SVG assets are not allowed");
    }

    // Detect MIME from file signature
    const detectedMime = detectMimeType(data);
    if (!detectedMime) {
      throw new Error(`Unsupported or spoofed MIME type (detected: ${contentType ?? "unknown"})`);
    }

    return { data, mimeType: detectedMime };
  };

  const upload = async (input: AssetUploadInput): Promise<AssetResult> => {
    const { data, mimeType } = await validateAndDownload(input.sourceUrl);
    const hash = sha256(data);
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : mimeType === "image/gif" ? "gif" : "webp";
    const storagePath = `assets/${input.courseId}/${hash}.${ext}`;

    // Idempotent: skip if object already exists
    const existing = await statObject(writerClient, storageConfig.bucket, storagePath);
    if (!existing) {
      await putAsset(writerClient, {
        bucket: storageConfig.bucket,
        key: storagePath,
        data,
        contentType: mimeType,
      });
    }

    // Persist DB row
    const result = await db.execute<{ id: string }>(sql`
      insert into assets (course_id, lesson_id, type, title, description, alt_text, storage_path, source_url, source_id, mime_type, file_size, metadata)
      values (
        ${input.courseId},
        ${input.lessonId ?? null},
        'source_image',
        ${input.title ?? 'Research image'},
        ${input.description ?? null},
        ${input.altText ?? null},
        ${storagePath},
        ${input.sourceUrl},
        ${input.sourceId ?? null},
        ${mimeType},
        ${data.length},
        ${JSON.stringify({ sha256: hash, uploadedBy: "worker" })}::jsonb
      )
      returning id
    `);

    const row = result.rows[0];
    if (!row) throw new Error("Asset DB insert failed");
    return { assetId: row.id, storagePath, mimeType, fileSize: data.length, sha256: hash };
  };

  const findOrphans = async (courseId: string): Promise<string[]> => {
    const result = await db.execute<{ id: string; storage_path: string }>(sql`
      select id, storage_path from assets where course_id = ${courseId}
    `);
    const orphans: string[] = [];
    for (const row of result.rows) {
      const stat = await statObject(writerClient, storageConfig.bucket, row.storage_path);
      if (!stat) orphans.push(row.id);
    }
    return orphans;
  };

  return { upload, findOrphans, ensureBucket: () => ensureBucket(writerClient, storageConfig.bucket) };
};

export { MAX_ASSET_BYTES, ALLOWED_MIME_TYPES, detectMimeType, isSvg };
