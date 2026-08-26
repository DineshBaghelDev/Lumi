import assert from "node:assert/strict";
import test from "node:test";

import {
  curriculumStructuredOutputSchema,
  lessonContentSchema,
  projectContentSchema,
  questionCandidateSchema,
  scoreObjectiveQuestion,
  type CurriculumStructuredOutput,
  type LessonContent,
} from "./index.ts";

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

const validLesson = (): LessonContent => ({
  schemaVersion: 1,
  title: "Redis stream basics",
  summary: "A source-backed lesson on appending and reading Redis stream entries.",
  blocks: [
    { id: "block-heading", type: "heading", level: 2, text: "Append-only streams" },
    {
      id: "block-intro",
      type: "paragraph",
      text: "Redis streams store ordered entries that consumers can read by ID.",
      sourceRefs: [{ sourceId, chunkId: "44444444-4444-4444-8444-444444444444" }],
    },
    {
      id: "block-flow",
      type: "mermaid",
      diagram: "flowchart LR\nProducer --> Stream --> Consumer",
      caption: "Producer to stream to consumer.",
      sourceRefs: [{ sourceId }],
    },
    { id: "block-image", type: "image", assetId: "55555555-5555-4555-8555-555555555555", caption: "Stream entry lifecycle." },
  ],
});

test("valid lesson content parses and exposes typed blocks", () => {
  const parsed = lessonContentSchema.parse(validLesson());
  assert.equal(parsed.blocks[2]?.type, "mermaid");
});

test("unknown lesson block type and duplicate block ids fail", () => {
  assert.throws(
    () => lessonContentSchema.parse({ ...validLesson(), blocks: [{ id: "block-nope", type: "video", url: "x" }] }),
    /Invalid discriminator value/,
  );

  const duplicate = validLesson();
  duplicate.blocks[1]!.id = duplicate.blocks[0]!.id;
  assert.throws(() => lessonContentSchema.parse(duplicate), /duplicate block id/);
});

test("image blocks require assetId and reject permanent URLs", () => {
  assert.throws(
    () => lessonContentSchema.parse({ ...validLesson(), blocks: [{ id: "block-image", type: "image", caption: "missing asset" }] }),
    /assetId/,
  );

  assert.throws(
    () => lessonContentSchema.parse({
      ...validLesson(),
      blocks: [{ id: "block-image", type: "image", assetId: "55555555-5555-4555-8555-555555555555", url: "https://cdn.example.test/file.png" }],
    }),
    /Unrecognized key/,
  );
});

test("project content validates ordered milestones and progressive hints", () => {
  const validProject = {
    schemaVersion: 1,
    storyline: "A learner builds a local cache inspector for a small app.",
    teachingProgression: ["Find the cache problem", "Choose a policy", "Implement locally"],
    milestones: [
      {
        orderIndex: 1,
        scenario: "The app is evicting important Redis keys during a traffic spike.",
        learnerDecisionPrompt: "Which key signal should guide the first policy?",
        implementationGoal: "Build a local script that records cache hits and misses.",
        constraints: ["Use only local data"],
        expectedOutcome: "The script prints a hit-rate summary.",
        relevantConceptIds: [redisConcept],
        relevantLessonIds: ["66666666-6666-4666-8666-666666666666"],
        hints: [
          { level: "conceptual", text: "Start with what a hit means." },
          { level: "structural", text: "Keep counters beside each lookup." },
        ],
      },
    ],
  };

  assert.equal(projectContentSchema.parse(validProject).milestones.length, 1);
  assert.throws(
    () => projectContentSchema.parse({
      ...validProject,
      milestones: [{ ...validProject.milestones[0], hints: [{ level: "implementation", text: "Write the whole script." }] }],
    }),
    /first hint/,
  );
});

test("question contracts and deterministic scoring cover objective types", () => {
  const mcq = questionCandidateSchema.parse({
    id: "question-mcq-1",
    kind: "mcq",
    prompt: "Which event means a cache lookup succeeded?",
    difficulty: 1,
    sourceRefs: [],
    primaryConceptId: redisConcept,
    additionalConceptIds: [],
    options: [{ id: "opt-hit", text: "Hit" }, { id: "opt-miss", text: "Miss" }],
    answerKey: { correctOptionId: "opt-hit" },
  });
  if (mcq.kind !== "mcq") assert.fail("expected mcq fixture");
  assert.deepEqual(scoreObjectiveQuestion(mcq, mcq.answerKey, "opt-hit"), { correct: true, reason: "matched" });

  const fillBlank = questionCandidateSchema.parse({
    id: "question-fill-1",
    kind: "fill_blank",
    prompt: "A successful cache lookup is a ___.",
    difficulty: 1,
    sourceRefs: [],
    primaryConceptId: redisConcept,
    additionalConceptIds: [],
    answerKey: { acceptedAnswers: ["hit"] },
  });
  if (fillBlank.kind !== "fill_blank") assert.fail("expected fill_blank fixture");
  assert.deepEqual(scoreObjectiveQuestion(fillBlank, fillBlank.answerKey, " Hit. "), { correct: true, reason: "matched_variant" });
});
