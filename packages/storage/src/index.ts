import { Client as MinioClient } from "minio";

export type StorageClient = MinioClient;

export type StorageConfig = {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  readerAccessKey: string;
  readerSecretKey: string;
  assetMaxBytes: number;
};

export type PutObjectInput = {
  bucket: string;
  key: string;
  data: Buffer;
  contentType: string;
};

export type ObjectInfo = {
  etag: string;
  versionId?: string;
};

const parseEndpoint = (url: string): { endPoint: string; port: number; useSSL: boolean } => {
  const parsed = new URL(url);
  return {
    endPoint: parsed.hostname,
    port: Number(parsed.port) || (parsed.protocol === "https:" ? 443 : 80),
    useSSL: parsed.protocol === "https:",
  };
};

export const createWriterClient = (config: StorageConfig): MinioClient => {
  const { endPoint, port, useSSL } = parseEndpoint(config.endpoint);
  return new MinioClient({ endPoint, port, useSSL, accessKey: config.accessKey, secretKey: config.secretKey });
};

export const createReaderClient = (config: StorageConfig): MinioClient => {
  const { endPoint, port, useSSL } = parseEndpoint(config.endpoint);
  return new MinioClient({ endPoint, port, useSSL, accessKey: config.readerAccessKey, secretKey: config.readerSecretKey });
};

export const ensureBucket = async (client: MinioClient, bucket: string): Promise<void> => {
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
    // Private by default — no anonymous policy
  }
};

export const putAsset = async (
  client: MinioClient,
  input: PutObjectInput,
): Promise<ObjectInfo> => {
  const result = await client.putObject(input.bucket, input.key, input.data, input.data.length, {
    "Content-Type": input.contentType,
  });
  return { etag: typeof result === "string" ? result : String(result), versionId: undefined };
};

export const statObject = async (
  client: MinioClient,
  bucket: string,
  key: string,
): Promise<{ size: number; etag: string } | null> => {
  try {
    const stat = await client.statObject(bucket, key);
    return { size: stat.size, etag: String(stat.etag) };
  } catch {
    return null;
  }
};

export const getObject = async (
  client: MinioClient,
  bucket: string,
  key: string,
): Promise<Buffer | null> => {
  try {
    const stream = await client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
};

export const removeObject = async (
  client: MinioClient,
  bucket: string,
  key: string,
): Promise<void> => {
  await client.removeObjects(bucket, [key]);
};

export const parseStorageConfig = (env: Record<string, string | undefined>): StorageConfig => ({
  endpoint: env.MINIO_ENDPOINT ?? "http://127.0.0.1:9000",
  bucket: env.MINIO_BUCKET ?? "lumi-assets",
  accessKey: env.MINIO_ACCESS_KEY ?? "lumi_worker_key",
  secretKey: env.MINIO_SECRET_KEY ?? "",
  readerAccessKey: env.MINIO_READER_ACCESS_KEY ?? "lumi_reader_key",
  readerSecretKey: env.MINIO_READER_SECRET_KEY ?? "",
  assetMaxBytes: Number(env.MINIO_ASSET_MAX_BYTES ?? 5_242_880),
});
