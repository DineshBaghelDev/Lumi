import { strict as assert } from "node:assert";
import test from "node:test";
import { deriveCourseProgress, resolveResumeHref } from "./course-progress.ts";

test("course progress marks fully completed courses only when no extra coursework remains", () => {
  assert.deepEqual(
    deriveCourseProgress({
      courseStatus: "ready",
      resumePoint: { type: "course_complete" },
      lessons: [{ id: "l1", status: "ready", is_required: true }],
      projects: [],
    }),
    {
      progressLabel: "100%",
      stateLabel: "Complete",
      lessonSummary: "1 required lessons complete",
      projectSummary: "No projects",
      summary: "All required lessons are complete.",
    },
  );

  assert.equal(
    deriveCourseProgress({
      courseStatus: "ready",
      resumePoint: { type: "course_complete" },
      lessons: [{ id: "l1", status: "ready", is_required: true, assessment_id: "a1", assessment_status: "ready" }],
      projects: [],
    }).stateLabel,
    "Continue",
  );
});

test("course progress uses learner resume state instead of content readiness", () => {
  const state = deriveCourseProgress({
    courseStatus: "ready",
    resumePoint: { type: "lesson", lessonId: "l3", blockIndex: 2 },
    lessons: [
      { id: "l1", status: "ready", is_required: true },
      { id: "l2", status: "ready", is_required: true },
      { id: "l3", status: "ready", is_required: true },
      { id: "l4", status: "ready", is_required: true },
    ],
    projects: [{ status: "ready" }],
  });

  assert.equal(state.progressLabel, "50%");
  assert.equal(state.stateLabel, "Continue");
  assert.equal(state.lessonSummary, "4 lessons available");
  assert.equal(state.projectSummary, "1 projects available");
});

test("course progress shows partial content while generation continues", () => {
  const state = deriveCourseProgress({
    courseStatus: "generating",
    resumePoint: null,
    lessons: [
      { id: "l1", status: "ready", is_required: true },
      { id: "l2", status: "queued", is_required: true },
    ],
    projects: [{ status: "ready" }],
  });

  assert.equal(state.progressLabel, "50%");
  assert.equal(state.lessonSummary, "1 / 2 lessons ready");
  assert.equal(state.projectSummary, "1 projects available");
});

test("resume links stay on the lesson when there is an active lesson target", () => {
  assert.equal(resolveResumeHref("course-1", { type: "lesson", lessonId: "lesson-9", blockIndex: 4 }), "/courses/course-1/lesson/lesson-9");
  assert.equal(resolveResumeHref("course-1", { type: "course_complete" }), "/courses/course-1/lessons");
});
