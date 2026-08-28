import { strict as assert } from "node:assert";
import test from "node:test";
import { assetImageSrc, inlineMarkdown } from "./lesson-rendering.ts";

test("assetImageSrc only renders actual browser-fetchable safe assets", () => {
  assert.equal(assetImageSrc("https://cdn.example.test/image.png"), "https://cdn.example.test/image.png");
  assert.equal(assetImageSrc("/assets/course/image.png"), "/assets/course/image.png");
  assert.equal(assetImageSrc("research/course/assets/image.png"), null);
  assert.equal(assetImageSrc("http://cdn.example.test/image.png"), null);
});

test("assetImageSrc routes local storage paths through the authenticated proxy", () => {
  assert.equal(assetImageSrc("assets/course-1/abc.png", "asset-uuid"), "/api/proxy/assets/asset-uuid/stream");
  assert.equal(assetImageSrc("assets/course-1/abc.png"), null);
});

test("inlineMarkdown keeps a tiny safe markdown subset", () => {
  assert.deepEqual(inlineMarkdown("Use **indexes** with `EXPLAIN` and [docs](https://example.test)."), [
    { type: "text", text: "Use " },
    { type: "strong", text: "indexes" },
    { type: "text", text: " with " },
    { type: "code", text: "EXPLAIN" },
    { type: "text", text: " and " },
    { type: "link", text: "docs", href: "https://example.test" },
    { type: "text", text: "." },
  ]);
  assert.deepEqual(inlineMarkdown("[bad](javascript:alert(1))"), [{ type: "text", text: "[bad](javascript:alert(1))" }]);
});
