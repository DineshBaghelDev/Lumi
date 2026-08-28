import { strict as assert } from "node:assert";
import test from "node:test";
import { deriveCourseStatus } from "./courses.ts";

test("deriveCourseStatus returns ready_with_gaps for mixed terminal results after curriculum", () => {
  const status = deriveCourseStatus({
    hasCurriculum: true,
    currentStatus: "generating",
    jobs: [
      { type: "research", status: "succeeded" },
      { type: "curriculum", status: "succeeded" },
      { type: "lesson", status: "failed" },
      { type: "lesson", status: "succeeded" },
      { type: "project", status: "cancelled" },
    ],
  });

  assert.equal(status, "ready_with_gaps");
});

test("deriveCourseStatus returns ready when all work finished successfully", () => {
  const status = deriveCourseStatus({
    hasCurriculum: true,
    currentStatus: "generating",
    jobs: [
      { type: "research", status: "succeeded" },
      { type: "curriculum", status: "succeeded" },
      { type: "lesson", status: "succeeded" },
      { type: "project", status: "succeeded" },
      { type: "question", status: "succeeded" },
    ],
  });

  assert.equal(status, "ready");
});

test("deriveCourseStatus keeps active work generating", () => {
  const status = deriveCourseStatus({
    hasCurriculum: true,
    currentStatus: "generating",
    jobs: [
      { type: "research", status: "succeeded" },
      { type: "curriculum", status: "succeeded" },
      { type: "lesson", status: "running" },
    ],
  });

  assert.equal(status, "generating");
});

test("deriveCourseStatus fails terminal courses that never reached curriculum", () => {
  const status = deriveCourseStatus({
    hasCurriculum: false,
    currentStatus: "generating",
    jobs: [
      { type: "research", status: "succeeded" },
      { type: "curriculum", status: "cancelled" },
    ],
  });

  assert.equal(status, "failed");
});
