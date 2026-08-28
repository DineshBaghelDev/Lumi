import { strict as assert } from "node:assert";
import test from "node:test";
import { detectMimeType, isSvg, MAX_ASSET_BYTES } from "./assets.ts";

test("detectMimeType identifies PNG from signature", () => {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectMimeType(header), "image/png");
});

test("detectMimeType identifies JPEG from signature", () => {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(detectMimeType(header), "image/jpeg");
});

test("detectMimeType identifies GIF from signature", () => {
  const header = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  assert.equal(detectMimeType(header), "image/gif");
});

test("detectMimeType identifies WebP from RIFF header", () => {
  const header = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(detectMimeType(header), "image/webp");
});

test("detectMimeType returns null for unknown signature", () => {
  const header = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  assert.equal(detectMimeType(header), null);
});

test("detectMimeType rejects spoofed MIME (PDF pretending to be image)", () => {
  const header = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
  assert.equal(detectMimeType(header), null);
});

test("isSvg detects SVG content type header", () => {
  assert.equal(isSvg(Buffer.alloc(8), "image/svg+xml"), true);
});

test("isSvg detects SVG in file content", () => {
  const content = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\"/></svg>");
  assert.equal(isSvg(content, "image/png"), true);
});

test("isSvg detects DOCTYPE SVG", () => {
  const content = Buffer.from("<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">");
  assert.equal(isSvg(content, "image/png"), true);
});

test("isSvg returns false for non-SVG content", () => {
  const content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(isSvg(content, "image/png"), false);
});

test("MAX_ASSET_BYTES is 5 MB", () => {
  assert.equal(MAX_ASSET_BYTES, 5 * 1024 * 1024);
});
