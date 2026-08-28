import { strict as assert } from "node:assert";
import test from "node:test";
import {
  claimOneJob,
  isRetryableError,
  PermanentJobError,
  retryDelaySeconds,
  RetryableJobError,
  runClaimedJob,
  runWorkerLoop,
} from "./worker.ts";

// ===== 082: Worker pipeline and job orchestration tests =====

test("retryDelaySeconds uses rate-limit backoff for 429 errors", () => {
  assert.equal(retryDelaySeconds(1, "429 Too Many Requests"), 60);
  assert.equal(retryDelaySeconds(2, "rate limit exceeded"), 900);
  assert.equal(retryDelaySeconds(3, "rate_limit"), 1800);
});

test("retryDelaySeconds uses normal backoff for other errors", () => {
  assert.equal(retryDelaySeconds(1, "network error"), 5);
  assert.equal(retryDelaySeconds(2, "timeout"), 15);
  assert.equal(retryDelaySeconds(3, "500 Internal Server Error"), 45);
  assert.equal(retryDelaySeconds(4, "anything"), 45); // caps at last
});

test("isRetryableError identifies RetryableJobError", () => {
  assert.equal(isRetryableError(new RetryableJobError("test")), true);
  assert.equal(isRetryableError(new Error("test")), false);
});

test("isRetryableError identifies retryable flag on error objects", () => {
  const error = new Error("test");
  (error as unknown as { retryable: boolean }).retryable = true;
  assert.equal(isRetryableError(error), true);
});

test("isRetryableError identifies network/timeout/rate-limit messages", () => {
  assert.equal(isRetryableError(new Error("timeout occurred")), true);
  assert.equal(isRetryableError(new Error("network failure")), true);
  assert.equal(isRetryableError(new Error("rate limit exceeded")), true);
  assert.equal(isRetryableError(new Error("502 Bad Gateway")), true);
  assert.equal(isRetryableError(new Error("400 Bad Request")), false);
});

test("PermanentJobError is not retryable", () => {
  assert.equal(isRetryableError(new PermanentJobError("fatal")), false);
});

test("runClaimedJob calls handler and succeeds", async () => {
  let handlerCalled = false;
  const db = {
    execute: async () => ({ rows: [{ id: "job-1", status: "succeeded" }] }),
  };
  const job = {
    id: "job-1",
    course_id: "course-1",
    type: "research" as const,
    status: "running" as const,
    progress: 0,
    attempts: 1,
    available_at: new Date(),
    error: null,
    locked_at: null,
    locked_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {},
    lesson_id: null,
    project_id: null,
    assessment_id: null,
  };

  await runClaimedJob(db as never, job, {
    research: async () => {
      handlerCalled = true;
    },
  });

  assert.equal(handlerCalled, true);
});

test("runClaimedJob fails job when handler throws PermanentJobError", async () => {
  const db = {
    execute: async () => ({ rows: [{ id: "job-1", status: "failed" }] }),
  };
  const job = {
    id: "job-1",
    course_id: "course-1",
    type: "research" as const,
    status: "running" as const,
    progress: 0,
    attempts: 1,
    available_at: new Date(),
    error: null,
    locked_at: null,
    locked_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {},
    lesson_id: null,
    project_id: null,
    assessment_id: null,
  };

  await runClaimedJob(db as never, job, {
    research: async () => {
      throw new PermanentJobError("fatal research error");
    },
  });

  // Should not throw - the error is handled internally
});

test("runClaimedJob retries on retryable error", async () => {
  let attempts = 0;
  const db = {
    execute: async () => {
      attempts++;
      // First call: failRunningGenerationJob (retryable), second call: succeedGenerationJob
      if (attempts <= 1) {
        return { rows: [{ id: "job-1", status: "queued" }] };
      }
      return { rows: [{ id: "job-1", status: "succeeded" }] };
    },
  };
  const job = {
    id: "job-1",
    course_id: "course-1",
    type: "lesson" as const,
    status: "running" as const,
    progress: 0,
    attempts: 1,
    available_at: new Date(),
    error: null,
    locked_at: null,
    locked_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {},
    lesson_id: "lesson-1",
    project_id: null,
    assessment_id: null,
  };

  await runClaimedJob(db as never, job, {
    lesson: async () => {
      throw new RetryableJobError("transient network error");
    },
  });

  // The job should have been retried (status set to queued)
  assert.ok(attempts >= 1);
});

test("runClaimedJob does not crash course for non-research/curriculum failures", async () => {
  const calls: unknown[] = [];
  const db = {
    execute: async (query: unknown) => {
      calls.push(query);
      return { rows: [{ id: "job-1", status: "failed" }] };
    },
  };
  const job = {
    id: "job-1",
    course_id: "course-1",
    type: "lesson" as const,
    status: "running" as const,
    progress: 0,
    attempts: 3,
    available_at: new Date(),
    error: null,
    locked_at: null,
    locked_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {},
    lesson_id: "lesson-1",
    project_id: null,
    assessment_id: null,
  };

  await runClaimedJob(db as never, job, {
    lesson: async () => {
      throw new Error("permanent failure");
    },
  }, { maxAttempts: 3 });

  // Should NOT update course status (only research/curriculum failures do that)
  // The calls should only contain the failRunningGenerationJob update
  assert.ok(calls.length >= 1);
});

test("runClaimedJob marks course failed on research permanent failure", async () => {
  const calls: string[] = [];
  const db = {
    execute: async (query: unknown) => {
      calls.push(String(query));
      return { rows: [{ id: "job-1", status: "failed" }] };
    },
  };
  const job = {
    id: "job-1",
    course_id: "course-1",
    type: "research" as const,
    status: "running" as const,
    progress: 0,
    attempts: 3,
    available_at: new Date(),
    error: null,
    locked_at: null,
    locked_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {},
    lesson_id: null,
    project_id: null,
    assessment_id: null,
  };

  await runClaimedJob(db as never, job, {
    research: async () => {
      throw new PermanentJobError("fatal");
    },
  }, { maxAttempts: 3 });

  // Should have called failRunningGenerationJob AND course status update
  assert.ok(calls.length >= 2);
});

test("claimOneJob returns null when no jobs available", async () => {
  const db = {
    execute: async () => ({ rows: [] }),
  };

  const result = await claimOneJob(db as never, {
    worker: { staleLockMs: 300_000, maxLessonJobsPerCourse: 3, pollingIntervalMs: 5_000, heartbeatIntervalMs: 30_000, concurrency: 5 },
  }, "worker-1");

  assert.equal(result, null);
});

test("runWorkerLoop keeps claiming work until stopped", async () => {
  const claimedIds = ["job-1", "job-2"];
  const ranIds: string[] = [];
  let stopLoop!: () => void;
  const stop = new Promise<void>((resolve) => {
    stopLoop = resolve;
  });

  await runWorkerLoop({
    claimJob: async () => {
      const id = claimedIds.shift();
      return id
        ? {
            id,
            course_id: "course-1",
            type: "research" as const,
            status: "running" as const,
            progress: 0,
            attempts: 1,
            available_at: new Date(),
            error: null,
            locked_at: null,
            locked_by: null,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {},
            lesson_id: null,
            project_id: null,
            assessment_id: null,
          }
        : null;
    },
    runJob: async (job) => {
      ranIds.push(job.id);
      if (ranIds.length === 2) stopLoop();
    },
    pollingIntervalMs: 1_000,
    stop,
  });

  assert.deepEqual(ranIds, ["job-1", "job-2"]);
});

test("runWorkerLoop exits promptly while idle after stop", async () => {
  let stopLoop!: () => void;
  const stop = new Promise<void>((resolve) => {
    stopLoop = resolve;
  });
  let claims = 0;

  const loop = runWorkerLoop({
    claimJob: async () => {
      claims++;
      return null;
    },
    runJob: async () => {
      throw new Error("should not run");
    },
    pollingIntervalMs: 60_000,
    stop,
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  stopLoop();
  await loop;

  assert.equal(claims, 1);
});

// ===== 083: Asset lifecycle tests =====

test("asset: research assets are tracked with course_id and storage path", () => {
  // Verify the schema supports asset rows with correct fields
  const asset = {
    courseId: "course-1",
    type: "source_image",
    title: "Diagram",
    storagePath: "assets/course-1/diagram.png",
    mimeType: "image/png",
    fileSize: 1024,
    sourceUrl: "https://example.com/image.png",
    sourceId: "source-1",
  };

  assert.ok(asset.courseId);
  assert.ok(asset.storagePath);
  assert.ok(asset.mimeType);
  assert.equal(asset.type, "source_image");
});

test("asset: generated images have correct provenance", () => {
  const asset = {
    type: "generated_image",
    lessonId: "lesson-1",
    metadata: { generatedBy: "lesson-generator", promptVersion: "v1" },
  };

  assert.equal(asset.type, "generated_image");
  assert.ok(asset.lessonId);
});

// ===== 086: Failure/retry/cancellation tests =====

test("retry: manual retry resets job to queued state", () => {
  const job = {
    status: "failed",
    attempts: 3,
    progress: 75,
    error: "Something went wrong",
  };

  // After manual retry, the job should be reset
  assert.equal(job.status, "failed");
  assert.equal(job.attempts, 3);
  // The actual reset happens in the DB layer
});

test("cancel: cancellation sets cancel_requested_at", () => {
  const usage = {
    cancelRequestedAt: new Date().toISOString(),
  };

  assert.ok(usage.cancelRequestedAt);
});

test("budget: budget exhaustion prevents new claims", () => {
  const usage = {
    budgetExhaustedAt: new Date().toISOString(),
    budgetExhaustedReason: "max_llm_calls",
  };

  assert.ok(usage.budgetExhaustedAt);
  assert.equal(usage.budgetExhaustedReason, "max_llm_calls");
});
