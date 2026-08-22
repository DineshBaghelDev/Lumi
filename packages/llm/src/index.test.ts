import { strict as assert } from "node:assert";
import test from "node:test";
import { LiteLlmClient, LlmClientError, recordLlmCall } from "./index.ts";

test("recordLlmCall inserts one observability row", async () => {
  const inserted: unknown[] = [];
  const db = {
    insert: () => ({
      values: (value: unknown) => {
        inserted.push(value);
        return {
          returning: async () => [{ id: "call-1" }],
        };
      },
    }),
  };

  const row = await recordLlmCall(db as unknown as Parameters<typeof recordLlmCall>[0], {
    model: "test-model",
    promptVersion: "prompt-v1",
    inputTokens: 10,
    outputTokens: 20,
    latencyMs: 30,
    rawRequestId: "raw-1",
  });

  assert.deepEqual(row, { id: "call-1" });
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0], {
    jobId: null,
    model: "test-model",
    promptVersion: "prompt-v1",
    inputTokens: 10,
    outputTokens: 20,
    latencyMs: 30,
    costUsd: null,
    rawRequestId: "raw-1",
    metadata: {},
  });
});

test("LiteLLM client normalizes completion responses", async () => {
  const client = new LiteLlmClient(
    { baseUrl: "http://litellm.test", apiKey: "key", model: "gpt-5.5" },
    async (url, init) => {
      assert.equal(String(url), "http://litellm.test/v1/chat/completions");
      assert.equal((init?.headers as Record<string, string>).authorization, "Bearer key");
      assert.match(String(init?.body), /system/);
      return new Response(JSON.stringify({
        id: "raw-1",
        model: "gpt-5.5",
        usage: { prompt_tokens: 3, completion_tokens: 5 },
        choices: [{ message: { content: "{\"ok\":true}" } }],
      }));
    },
  );

  const result = await client.complete({
    messages: [
      { role: "system", content: "You return JSON." },
      { role: "user", content: "Ping" },
    ],
  });

  assert.equal(result.content, "{\"ok\":true}");
  assert.equal(result.inputTokens, 3);
  assert.equal(result.outputTokens, 5);
  assert.equal(result.rawRequestId, "raw-1");
});

test("LiteLLM structured calls parse JSON and require system messages", async () => {
  const client = new LiteLlmClient(
    { baseUrl: "http://litellm.test", apiKey: "key", model: "gpt-5.5" },
    async () => new Response(JSON.stringify({ choices: [{ message: { content: "{\"name\":\"Redis\"}" } }] })),
  );

  assert.deepEqual(
    await client.structured(
      { messages: [{ role: "system", content: "JSON only" }, { role: "user", content: "topic" }] },
      (value) => value,
    ),
    { name: "Redis" },
  );

  await assert.rejects(
    client.complete({ messages: [{ role: "user", content: "missing system" }] }),
    /system message/,
  );
});

test("LiteLLM marks network and upstream failures retryable", async () => {
  const network = new LiteLlmClient(
    { baseUrl: "http://litellm.test", apiKey: "key", model: "gpt-5.5" },
    async () => {
      throw new Error("network timeout");
    },
  );

  await assert.rejects(
    network.complete({ messages: [{ role: "system", content: "x" }] }),
    (error) => error instanceof LlmClientError && error.retryable,
  );

  const upstream = new LiteLlmClient(
    { baseUrl: "http://litellm.test", apiKey: "key", model: "gpt-5.5" },
    async () => new Response("nope", { status: 500 }),
  );

  await assert.rejects(
    upstream.complete({ messages: [{ role: "system", content: "x" }] }),
    (error) => error instanceof LlmClientError && error.retryable,
  );
});
