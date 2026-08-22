import { strict as assert } from "node:assert";
import test from "node:test";
import { recordLlmCall } from "./index.ts";

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
