import { strict as assert } from "node:assert";
import test from "node:test";
import { Crawl4aiClient, ResearchClientError, SearxngClient, TeiClient } from "./research-clients.ts";

test("SearXNG client normalizes JSON results", async () => {
  const client = new SearxngClient("http://searxng.test", async (url) => {
    assert.equal(String(url), "http://searxng.test/search?q=redis&format=json");
    return new Response(JSON.stringify({
      results: [{ title: "Redis", url: "https://redis.io", content: "docs", engine: "fixture" }],
    }));
  });

  assert.deepEqual(await client.search("redis", { limit: 2 }), [{
    title: "Redis",
    url: "https://redis.io",
    snippet: "docs",
    source: "fixture",
  }]);
});

test("Crawl4AI client preserves page links and images", async () => {
  const client = new Crawl4aiClient("http://crawl.test", async () => new Response(JSON.stringify({
    results: [{
      url: "https://redis.io/docs",
      markdown: "# Redis\n\nStreams documentation body with enough useful words.",
      metadata: { title: "Redis docs" },
      links: ["https://redis.io"],
      images: [{ url: "https://redis.io/a.png", alt: "diagram", mime_type: "image/png", byte_length: 12 }],
    }],
  })));

  const pages = await client.crawl(["https://redis.io/docs"]);
  assert.equal(pages[0]?.title, "Redis docs");
  assert.equal(pages[0]?.links[0], "https://redis.io");
  assert.equal(pages[0]?.images[0]?.mimeType, "image/png");
});

test("Crawl4AI client accepts object markdown from the Docker API", async () => {
  const client = new Crawl4aiClient("http://crawl.test", async () => new Response(JSON.stringify({
    success: true,
    results: [{
      url: "https://redis.io/docs",
      markdown: { raw_markdown: "# Redis\n\nStreams documentation body with enough useful words." },
      metadata: { title: "Redis docs" },
      media: { images: [{ url: "https://redis.io/a.png" }] },
    }],
  })));

  const pages = await client.crawl(["https://redis.io/docs"]);
  assert.match(pages[0]?.markdown ?? "", /Streams documentation/);
  assert.equal(pages[0]?.images[0]?.url, "https://redis.io/a.png");
});

test("Crawl4AI client keeps successful pages when one URL fails", async () => {
  const seen: string[] = [];
  const client = new Crawl4aiClient("http://crawl.test", async (_url, init) => {
    const url = (JSON.parse(String(init?.body)) as { urls: string[] }).urls[0]!;
    seen.push(url);
    if (url.includes("bad")) return new Response("boom", { status: 500 });
    return new Response(JSON.stringify({
      results: [{ url, markdown: "# Good\n\nUseful crawled content for a surviving page." }],
    }));
  });

  const pages = await client.crawl(["https://redis.io/good", "https://redis.io/bad"]);
  assert.deepEqual(seen, ["https://redis.io/good", "https://redis.io/bad"]);
  assert.equal(pages.length, 1);
  assert.equal(pages[0]?.url, "https://redis.io/good");
});

test("TEI client validates embedding dimensions", async () => {
  const ok = new TeiClient(
    { baseUrl: "http://tei.test", dimension: 3, modelId: "test" },
    async () => new Response(JSON.stringify([[1, 2, 3]])),
  );
  assert.deepEqual(await ok.embed("redis"), [1, 2, 3]);

  const bad = new TeiClient(
    { baseUrl: "http://tei.test", dimension: 3, modelId: "test" },
    async () => new Response(JSON.stringify([[1, 2]])),
  );
  await assert.rejects(
    bad.embed("redis"),
    (error) => error instanceof ResearchClientError && /dimension/.test(error.message),
  );
});
