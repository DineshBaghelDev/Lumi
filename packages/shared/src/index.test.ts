import assert from "node:assert/strict";
import test from "node:test";

import { curriculumStructuredOutputSchema, type CurriculumStructuredOutput } from "./index.ts";

const redisConcept = "11111111-1111-4111-8111-111111111111";
const evictionConcept = "22222222-2222-4222-8222-222222222222";
const sourceId = "33333333-3333-4333-8333-333333333333";

const validCurriculum = (): CurriculumStructuredOutput => ({
  schemaVersion: 1,
  conceptIds: [redisConcept, evictionConcept],
  sourcePacks: [
    {
      id: "redis-source-pack",
      conceptId: redisConcept,
      sourceIds: [sourceId],
      coverageStatus: "covered",
    },
  ],
  modules: [
    {
      id: "module-1",
      title: "Redis fundamentals",
      orderIndex: 1,
      lessons: [
        {
          id: "lesson-1",
          title: "Cache eviction basics",
          objectives: ["Explain why Redis evicts keys"],
          orderIndex: 1,
          isRequired: true,
          conceptIds: [redisConcept],
          sourcePackIds: ["redis-source-pack"],
          requiredPrerequisiteConceptIds: [evictionConcept],
          assessment: {
            title: "Eviction check",
            conceptIds: [redisConcept],
            questionCount: 3,
          },
        },
      ],
    },
  ],
  projects: [
    {
      id: "project-1",
      title: "Build a cache policy demo",
      goal: "Compare two Redis eviction policies locally",
      conceptIds: [redisConcept],
      lessonIds: ["lesson-1"],
      milestones: [
        {
          id: "milestone-1",
          title: "Run the first policy",
          orderIndex: 1,
          conceptIds: [redisConcept],
          lessonIds: ["lesson-1"],
        },
      ],
    },
  ],
  generationSummary: {
    title: "Redis caching starter curriculum",
    coverageStatus: "ready",
    notes: ["Uses source-backed Redis concepts"],
  },
});

test("valid curriculum fixture parses", () => {
  assert.equal(curriculumStructuredOutputSchema.parse(validCurriculum()).modules[0]?.lessons[0]?.isRequired, true);
});

test("missing objectives or order fails validation", () => {
  const missingObjective = validCurriculum();
  missingObjective.modules[0]!.lessons[0]!.objectives = [];
  assert.throws(() => curriculumStructuredOutputSchema.parse(missingObjective), /objectives/);

  const badOrder = validCurriculum();
  badOrder.modules[0]!.orderIndex = 2;
  assert.throws(() => curriculumStructuredOutputSchema.parse(badOrder), /contiguous/);
});

test("unknown prerequisite, source pack, and lesson refs fail validation", () => {
  const unknownPrerequisite = validCurriculum();
  unknownPrerequisite.modules[0]!.lessons[0]!.requiredPrerequisiteConceptIds = [
    "44444444-4444-4444-8444-444444444444",
  ];
  assert.throws(() => curriculumStructuredOutputSchema.parse(unknownPrerequisite), /unknown concept/);

  const unknownSourcePack = validCurriculum();
  unknownSourcePack.modules[0]!.lessons[0]!.sourcePackIds = ["missing-pack"];
  assert.throws(() => curriculumStructuredOutputSchema.parse(unknownSourcePack), /unknown source pack/);

  const unknownLesson = validCurriculum();
  unknownLesson.projects[0]!.milestones[0]!.lessonIds = ["missing-lesson"];
  assert.throws(() => curriculumStructuredOutputSchema.parse(unknownLesson), /unknown lesson/);
});

test("contract contains deterministic skeleton inputs", () => {
  const curriculum = curriculumStructuredOutputSchema.parse(validCurriculum());
  const lesson = curriculum.modules[0]!.lessons[0]!;
  const project = curriculum.projects[0]!;

  assert.deepEqual(
    [lesson.id, lesson.title, lesson.orderIndex, lesson.isRequired, lesson.objectives, lesson.sourcePackIds],
    ["lesson-1", "Cache eviction basics", 1, true, ["Explain why Redis evicts keys"], ["redis-source-pack"]],
  );
  assert.deepEqual(
    [project.id, project.milestones[0]!.id, project.milestones[0]!.orderIndex],
    ["project-1", "milestone-1", 1],
  );
});
