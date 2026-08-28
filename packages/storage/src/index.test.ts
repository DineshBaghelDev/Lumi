import { strict as assert } from "node:assert";
import test from "node:test";
import { parseStorageConfig, createWriterClient, createReaderClient } from "./index.ts";

test("parseStorageConfig uses env values with defaults", () => {
  const config = parseStorageConfig({});
  assert.equal(config.endpoint, "http://127.0.0.1:9000");
  assert.equal(config.bucket, "lumi-assets");
  assert.equal(config.assetMaxBytes, 5_242_880);
});

test("parseStorageConfig reads env overrides", () => {
  const config = parseStorageConfig({
    MINIO_ENDPOINT: "https://minio.example.com",
    MINIO_BUCKET: "custom-bucket",
    MINIO_ASSET_MAX_BYTES: "1024",
  });
  assert.equal(config.endpoint, "https://minio.example.com");
  assert.equal(config.bucket, "custom-bucket");
  assert.equal(config.assetMaxBytes, 1024);
});

test("createWriterClient constructs MinioClient with writer credentials", () => {
  const config = parseStorageConfig({
    MINIO_ENDPOINT: "http://127.0.0.1:9000",
    MINIO_ACCESS_KEY: "writer-key",
    MINIO_SECRET_KEY: "writer-secret",
    MINIO_READER_ACCESS_KEY: "reader-key",
    MINIO_READER_SECRET_KEY: "reader-secret",
  });
  const client = createWriterClient(config);
  assert.ok(client);
  assert.ok(typeof client.putObject === "function");
});

test("createReaderClient constructs MinioClient with reader credentials", () => {
  const config = parseStorageConfig({
    MINIO_ENDPOINT: "https://minio.example.com",
    MINIO_ACCESS_KEY: "writer-key",
    MINIO_SECRET_KEY: "writer-secret",
    MINIO_READER_ACCESS_KEY: "reader-key",
    MINIO_READER_SECRET_KEY: "reader-secret",
  });
  const client = createReaderClient(config);
  assert.ok(client);
  assert.ok(typeof client.getObject === "function");
});
