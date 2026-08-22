import { strict as assert } from "node:assert";
import test from "node:test";
import { isRetryableError, retryDelaySeconds } from "./worker.ts";

test("retry backoff is fixed and bounded", () => {
  assert.equal(retryDelaySeconds(1), 5);
  assert.equal(retryDelaySeconds(2), 15);
  assert.equal(retryDelaySeconds(3), 45);
  assert.equal(retryDelaySeconds(9), 45);
});

test("common transient errors are retryable", () => {
  assert.equal(isRetryableError(new Error("network timeout")), true);
  assert.equal(isRetryableError(new Error("500 upstream")), true);
  assert.equal(isRetryableError(new Error("validation failed")), false);
});
