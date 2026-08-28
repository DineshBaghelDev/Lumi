import { strict as assert } from "node:assert";
import test from "node:test";
import { buildApiUrl, readBoundedText } from "./route.ts";

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

test.afterEach(() => {
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

test("proxy URL builder keeps happy paths under the configured API origin", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test/v1";

  const url = buildApiUrl("courses/123?include=lessons");

  assert.equal(url.origin, "https://api.example.test");
  assert.equal(url.pathname, "/courses/123");
  assert.equal(url.search, "?include=lessons");
});

test("proxy URL builder rejects hostile URL forms", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";

  for (const path of [
    "https://evil.example/courses",
    "//evil.example/courses",
    "courses/../admin",
    "courses/%2e%2e/admin",
    "courses\\admin",
    "%zz",
  ]) {
    assert.throws(() => buildApiUrl(path), /Invalid proxy path/);
  }
});

test("bounded response reader rejects declared and streamed oversized bodies", async () => {
  await assert.rejects(
    readBoundedText(new Response("ok", { headers: { "content-length": "3" } }), 2),
    /API response too large/,
  );

  await assert.rejects(readBoundedText(new Response("toolong"), 2), /API response too large/);
  assert.equal(await readBoundedText(new Response("ok"), 2), "ok");
});
