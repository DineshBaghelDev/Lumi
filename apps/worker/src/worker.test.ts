import { strict as assert } from "node:assert";
import test from "node:test";
import type { GenerationJobRow, LumiDb } from "@lumi/db";
import { isRetryableError, retryDelaySeconds, runClaimedJob } from "./worker.ts";

const job: GenerationJobRow = {
  id: "job-1",
  course_id: "course-1",
  type: "lesson",
  status: "running",
  progress: 0,
  attempts: 1,
  available_at: new Date(),
  error: null,
  locked_at: new Date(),
  locked_by: "worker-1",
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {},
  lesson_id: "lesson-1",
  project_id: null,
  assessment_id: null,
};

test("retry backoff is fixed and bounded", () => {
  assert.equal(retryDelaySeconds(1), 5);
  assert.equal(retryDelaySeconds(2), 15);
  assert.equal(retryDelaySeconds(9), 45);
  assert.equal(retryDelaySeconds(1, "LiteLLM 429"), 60);
  assert.equal(retryDelaySeconds(2, "rate limit"), 900);
  assert.equal(retryDelaySeconds(9, "LiteLLM 429"), 1_800);
});

test("common transient errors are retryable", () => {
  assert.equal(isRetryableError(new Error("network timeout")), true);
  assert.equal(isRetryableError(new Error("500 upstream")), true);
  assert.equal(isRetryableError(Object.assign(new Error("fetch failed"), { retryable: true })), true);
  assert.equal(isRetryableError(new Error("validation failed")), false);
});

test("failed job finalization errors do not escape runClaimedJob", async () => {
  const db = {
    execute: async () => ({ rows: [] }),
  } as unknown as LumiDb;

  await runClaimedJob(db, job, {
    lesson: async () => {
      throw new Error("handler failed");
    },
  });
});

test("long-running jobs heartbeat while handler is active", async () => {
  let executeCount = 0;
  const db = {
    execute: async () => {
      executeCount += 1;
      return { rows: [job] };
    },
  } as unknown as LumiDb;

  await runClaimedJob(
    db,
    job,
    {
      lesson: async () => {
        await new Promise((resolve) => setTimeout(resolve, 35));
      },
    },
    { heartbeatIntervalMs: 10, workerId: "worker-1" },
  );

  assert.ok(executeCount >= 2);
});
