import { strict as assert } from "node:assert";
import test from "node:test";
import { canTransitionGenerationJob, type GenerationJobStatus } from "./jobs.ts";

const statuses: GenerationJobStatus[] = ["queued", "running", "succeeded", "failed", "cancelled"];
const allowed = new Set([
  "queued:running:claim",
  "running:succeeded:succeed",
  "running:queued:retryable_failure",
  "running:failed:permanent_failure",
  "queued:cancelled:cancel",
  "running:cancelled:cancel",
  "failed:queued:manual_retry",
]);
const reasons = [
  "claim",
  "succeed",
  "retryable_failure",
  "permanent_failure",
  "cancel",
  "manual_retry",
] as const;

test("generation job status transitions are explicit", () => {
  for (const from of statuses) {
    for (const to of statuses) {
      for (const reason of reasons) {
        assert.equal(
          canTransitionGenerationJob(from, to, reason),
          allowed.has(`${from}:${to}:${reason}`),
          `${from} -> ${to} via ${reason}`,
        );
      }
    }
  }
});
