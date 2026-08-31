import { z } from "zod";

const localIdSchema = z.string().trim().regex(/^[a-z][a-z0-9-]*$/, {
  message: "must be a lowercase stable id such as module-1",
});
const uuidSchema = z.uuid();
const nonEmptyText = z.string().trim().min(1);
const orderIndexSchema = z.number().int().positive();
const blockIdSchema = z.string().trim().regex(/^block-[a-z0-9-]+$/);

const sourcePackSchema = z.object({
  id: localIdSchema,
  conceptId: uuidSchema,
  sourceIds: z.array(uuidSchema).min(1),
  coverageStatus: z.enum(["covered", "weakly_covered", "explicitly_unresolved"]),
});

const assessmentSkeletonSchema = z.object({
  title: nonEmptyText,
  conceptIds: z.array(uuidSchema).min(1),
  questionCount: z.number().int().min(1).max(20),
});

const lessonSkeletonSchema = z.object({
  id: localIdSchema,
  title: nonEmptyText,
  objectives: z.array(nonEmptyText).min(1),
  orderIndex: orderIndexSchema,
  isRequired: z.boolean(),
  conceptIds: z.array(uuidSchema).min(1),
  sourcePackIds: z.array(localIdSchema).min(1),
  requiredPrerequisiteConceptIds: z.array(uuidSchema).default([]),
  assessment: assessmentSkeletonSchema,
});

const moduleSkeletonSchema = z.object({
  id: localIdSchema,
  title: nonEmptyText,
  description: nonEmptyText.optional(),
  orderIndex: orderIndexSchema,
  lessons: z.array(lessonSkeletonSchema).min(1),
});

const projectMilestoneOutlineSchema = z.object({
  id: localIdSchema,
  title: nonEmptyText,
  orderIndex: orderIndexSchema,
  conceptIds: z.array(uuidSchema).min(1),
  lessonIds: z.array(localIdSchema).min(1),
});

const projectSkeletonSchema = z.object({
  id: localIdSchema,
  title: nonEmptyText,
  goal: nonEmptyText,
  conceptIds: z.array(uuidSchema).min(1),
  lessonIds: z.array(localIdSchema).min(1),
  milestones: z.array(projectMilestoneOutlineSchema).min(1),
});

export const curriculumSchemaVersion = 1;
export const lessonContentSchemaVersion = 1;

export const curriculumStructuredOutputSchema = z
  .object({
    schemaVersion: z.literal(curriculumSchemaVersion),
    conceptIds: z.array(uuidSchema).min(1),
    sourcePacks: z.array(sourcePackSchema).min(1),
    modules: z.array(moduleSkeletonSchema).min(1),
    projects: z.array(projectSkeletonSchema).min(1),
    generationSummary: z.object({
      title: nonEmptyText,
      coverageStatus: z.enum(["ready", "ready_with_gaps"]),
      notes: z.array(nonEmptyText),
    }),
  })
  .superRefine((curriculum, context) => {
    const conceptIds = new Set(curriculum.conceptIds);
    const sourcePackIds = new Set<string>();
    const lessonIds = new Set<string>();

    requireUnique(curriculum.sourcePacks, "sourcePacks", context, (sourcePack) => sourcePack.id);
    requireOrdered(curriculum.modules, "modules", context);
    requireUnique(curriculum.modules, "modules", context, (module) => module.id);
    requireUnique(curriculum.projects, "projects", context, (project) => project.id);

    for (const sourcePack of curriculum.sourcePacks) {
      sourcePackIds.add(sourcePack.id);
      requireConceptRef(conceptIds, sourcePack.conceptId, ["sourcePacks", sourcePack.id, "conceptId"], context);
    }

    for (const [moduleIndex, module] of curriculum.modules.entries()) {
      requireOrdered(module.lessons, `modules.${module.id}.lessons`, context);
      requireUnique(module.lessons, `modules.${module.id}.lessons`, context, (lesson) => lesson.id);

      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        lessonIds.add(lesson.id);
        const path = ["modules", moduleIndex, "lessons", lessonIndex];
        for (const conceptId of [...lesson.conceptIds, ...lesson.requiredPrerequisiteConceptIds, ...lesson.assessment.conceptIds]) {
          requireConceptRef(conceptIds, conceptId, path, context);
        }
        for (const sourcePackId of lesson.sourcePackIds) {
          if (!sourcePackIds.has(sourcePackId)) {
            context.addIssue({ code: "custom", path: [...path, "sourcePackIds"], message: `unknown source pack: ${sourcePackId}` });
          }
        }
      }
    }

    for (const [projectIndex, project] of curriculum.projects.entries()) {
      requireOrdered(project.milestones, `projects.${project.id}.milestones`, context);
      requireUnique(project.milestones, `projects.${project.id}.milestones`, context, (milestone) => milestone.id);
      validateProjectRefs(project, projectIndex, conceptIds, lessonIds, context);
    }
  });

const requireConceptRef = (
  conceptIds: ReadonlySet<string>,
  conceptId: string,
  path: PropertyKey[],
  context: z.RefinementCtx,
) => {
  if (!conceptIds.has(conceptId)) {
    context.addIssue({ code: "custom", path, message: `unknown concept: ${conceptId}` });
  }
};

const requireUnique = <Item>(
  items: readonly Item[],
  label: string,
  context: z.RefinementCtx,
  key: (item: Item) => string,
) => {
  const seen = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) {
      context.addIssue({ code: "custom", path: [label], message: `duplicate id: ${value}` });
    }
    seen.add(value);
  }
};

const requireOrdered = <Item extends { orderIndex: number }>(
  items: readonly Item[],
  label: string,
  context: z.RefinementCtx,
) => {
  const expected = Array.from({ length: items.length }, (_, index) => index + 1);
  const actual = items.map((item) => item.orderIndex).sort((a, b) => a - b);
  if (actual.some((orderIndex, index) => orderIndex !== expected[index])) {
    context.addIssue({ code: "custom", path: [label], message: "orderIndex values must be contiguous from 1" });
  }
};

const validateProjectRefs = (
  project: z.infer<typeof projectSkeletonSchema>,
  projectIndex: number,
  conceptIds: ReadonlySet<string>,
  lessonIds: ReadonlySet<string>,
  context: z.RefinementCtx,
) => {
  for (const conceptId of project.conceptIds) {
    requireConceptRef(conceptIds, conceptId, ["projects", projectIndex, "conceptIds"], context);
  }
  for (const lessonId of project.lessonIds) {
    if (!lessonIds.has(lessonId)) {
      context.addIssue({ code: "custom", path: ["projects", projectIndex, "lessonIds"], message: `unknown lesson: ${lessonId}` });
    }
  }
  for (const [milestoneIndex, milestone] of project.milestones.entries()) {
    const path = ["projects", projectIndex, "milestones", milestoneIndex];
    for (const conceptId of milestone.conceptIds) {
      requireConceptRef(conceptIds, conceptId, [...path, "conceptIds"], context);
    }
    for (const lessonId of milestone.lessonIds) {
      if (!lessonIds.has(lessonId)) {
        context.addIssue({ code: "custom", path: [...path, "lessonIds"], message: `unknown lesson: ${lessonId}` });
      }
    }
  }
};

export type CurriculumStructuredOutput = z.infer<typeof curriculumStructuredOutputSchema>;

const sourceRefSchema = z.object({
  sourceId: uuidSchema,
  chunkId: uuidSchema.optional(),
  label: nonEmptyText.optional(),
}).strict();

const blockBaseSchema = z.object({
  id: blockIdSchema,
}).strict();

const citedBlockBaseSchema = blockBaseSchema.extend({
  sourceRefs: z.array(sourceRefSchema).default([]),
}).strict();

const headingBlockSchema = blockBaseSchema.extend({
  type: z.literal("heading"),
  level: z.number().int().min(2).max(4),
  text: nonEmptyText,
}).strict();

const paragraphBlockSchema = citedBlockBaseSchema.extend({
  type: z.literal("paragraph"),
  text: nonEmptyText,
}).strict();

const listBlockSchema = citedBlockBaseSchema.extend({
  type: z.literal("list"),
  style: z.enum(["ordered", "unordered"]),
  items: z.array(nonEmptyText).min(1),
}).strict();

const codeBlockSchema = citedBlockBaseSchema.extend({
  type: z.literal("code"),
  language: nonEmptyText,
  code: nonEmptyText,
  caption: nonEmptyText.optional(),
}).strict();

const calloutBlockSchema = citedBlockBaseSchema.extend({
  type: z.literal("callout"),
  tone: z.enum(["note", "warning", "tip"]),
  title: nonEmptyText.optional(),
  text: nonEmptyText,
}).strict();

const mermaidBlockSchema = citedBlockBaseSchema.extend({
  type: z.literal("mermaid"),
  diagram: nonEmptyText,
  caption: nonEmptyText.optional(),
}).strict();

const imageBlockSchema = blockBaseSchema.extend({
  type: z.literal("image"),
  assetId: uuidSchema,
  caption: nonEmptyText.optional(),
}).strict();

export const lessonBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  listBlockSchema,
  codeBlockSchema,
  calloutBlockSchema,
  mermaidBlockSchema,
  imageBlockSchema,
]);

export const lessonContentSchema = z
  .object({
    schemaVersion: z.literal(lessonContentSchemaVersion),
    title: nonEmptyText,
    summary: nonEmptyText,
    blocks: z.array(lessonBlockSchema).min(1),
  })
  .superRefine((lesson, context) => {
    const seen = new Set<string>();
    for (const [index, block] of lesson.blocks.entries()) {
      if (seen.has(block.id)) {
        context.addIssue({ code: "custom", path: ["blocks", index, "id"], message: `duplicate block id: ${block.id}` });
      }
      seen.add(block.id);
    }
  });

export type LessonContent = z.infer<typeof lessonContentSchema>;
export type LessonBlock = z.infer<typeof lessonBlockSchema>;

// ===== Guided project content (specs 057-059) =====

export const projectContentSchemaVersion = 1;

const hintLevelRank = { conceptual: 0, structural: 1, implementation: 2 } as const;

export const projectHintLevelSchema = z.enum(["conceptual", "structural", "implementation"]);

export const projectHintSchema = z.object({
  level: projectHintLevelSchema,
  text: nonEmptyText,
}).strict();

export const projectMilestoneContentSchema = z
  .object({
    orderIndex: orderIndexSchema,
    scenario: nonEmptyText,
    learnerDecisionPrompt: nonEmptyText.optional(),
    implementationGoal: nonEmptyText,
    constraints: z.array(nonEmptyText).max(6),
    expectedOutcome: nonEmptyText,
    relevantConceptIds: z.array(uuidSchema).min(1),
    relevantLessonIds: z.array(uuidSchema),
    hints: z.array(projectHintSchema).min(1).max(4),
  })
  .strict();

export const projectContentSchema = z
  .object({
    schemaVersion: z.literal(projectContentSchemaVersion),
    storyline: nonEmptyText,
    teachingProgression: z.array(nonEmptyText).min(2),
    milestones: z.array(projectMilestoneContentSchema).min(1),
  })
  .superRefine((project, context) => {
    requireOrdered(project.milestones, "milestones", context);
    for (const [milestoneIndex, milestone] of project.milestones.entries()) {
      const path = ["milestones", milestoneIndex];
      requireUnique(milestone.relevantLessonIds, `${path.join(".")}.relevantLessonIds`, context, (id) => id);
      const ranks = milestone.hints.map((hint) => hintLevelRank[hint.level]);
      if (ranks.some((rank, index) => index > 0 && rank < (ranks[index - 1] as number))) {
        context.addIssue({
          code: "custom",
          path: [...path, "hints"],
          message: "hints must escalate from conceptual to structural to implementation",
        });
      }
      if ((ranks[0] ?? 2) === hintLevelRank.implementation) {
        context.addIssue({
          code: "custom",
          path: [...path, "hints", 0],
          message: "the first hint must be conceptual or structural so the learner keeps meaningful work",
        });
      }
    }
  });

export type ProjectHint = z.infer<typeof projectHintSchema>;
export type ProjectMilestoneContent = z.infer<typeof projectMilestoneContentSchema>;
export type ProjectContent = z.infer<typeof projectContentSchema>;

// ===== Question and scoring contracts (specs 061, 064, 065) =====

export const questionSchemaVersion = 1;

export const objectiveQuestionKinds = ["mcq", "fill_blank", "matching", "prediction"] as const;
export const freeResponseQuestionKinds = ["short_answer", "scenario", "identify_issue", "pseudocode"] as const;

const optionIdSchema = z.string().trim().regex(/^opt-[a-z0-9-]+$/);
const pairIdSchema = z.string().trim().regex(/^side-[a-z0-9-]+$/);
const criterionIdSchema = z.string().trim().regex(/^crit-[a-z0-9-]+$/);

const difficultySchema = z.number().int().min(1).max(5);

const questionMetadataFields = {
  id: localIdSchema,
  difficulty: difficultySchema,
  sourceRefs: z.array(sourceRefSchema).default([]),
  primaryConceptId: uuidSchema,
  additionalConceptIds: z.array(uuidSchema).default([]),
};

const objectiveServingShapes = {
  mcq: {
    kind: z.literal("mcq"),
    prompt: nonEmptyText,
    codeContext: nonEmptyText.optional(),
    options: z.array(z.object({ id: optionIdSchema, text: nonEmptyText }).strict()).min(2).max(6),
  },
  prediction: {
    kind: z.literal("prediction"),
    prompt: nonEmptyText,
    codeContext: nonEmptyText.optional(),
    options: z.array(z.object({ id: optionIdSchema, text: nonEmptyText }).strict()).min(2).max(6),
  },
  fill_blank: {
    kind: z.literal("fill_blank"),
    prompt: nonEmptyText,
  },
  matching: {
    kind: z.literal("matching"),
    prompt: nonEmptyText,
    pairs: z
      .array(
        z.object({
          leftId: pairIdSchema,
          left: nonEmptyText,
          rightId: pairIdSchema,
          right: nonEmptyText,
        }).strict(),
      )
      .min(2)
      .max(6),
  },
};

const freeResponseServingShapes = {
  short_answer: { kind: z.literal("short_answer"), prompt: nonEmptyText },
  scenario: { kind: z.literal("scenario"), prompt: nonEmptyText },
  identify_issue: {
    kind: z.literal("identify_issue"),
    prompt: nonEmptyText,
    codeContext: nonEmptyText.optional(),
  },
  pseudocode: {
    kind: z.literal("pseudocode"),
    prompt: nonEmptyText,
    starterCode: nonEmptyText.optional(),
  },
};

const mcqAnswerKeySchema = z.object({ correctOptionId: optionIdSchema }).strict();
const fillBlankAnswerKeySchema = z.object({ acceptedAnswers: z.array(nonEmptyText).min(1).max(10) }).strict();
const matchingAnswerKeySchema = z.object({
  solution: z.array(z.object({ leftId: pairIdSchema, rightId: pairIdSchema }).strict()).min(2),
}).strict();

export const rubricSchema = z
  .object({
    pointsTotal: z.number().positive(),
    criteria: z
      .array(
        z.object({
          id: criterionIdSchema,
          description: nonEmptyText,
          points: z.number().positive(),
        }).strict(),
      )
      .min(1)
      .max(8),
    keyPoints: z.array(nonEmptyText).min(1).max(10),
  })
  .strict()
  .superRefine((rubric, context) => {
    const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.points, 0);
    if (Math.abs(total - rubric.pointsTotal) > 1e-9) {
      context.addIssue({ code: "custom", path: ["pointsTotal"], message: "criteria points must sum to pointsTotal" });
    }
  });

const candidateVariants = [
  z.object({ ...objectiveServingShapes.mcq, ...questionMetadataFields, answerKey: mcqAnswerKeySchema }).strict(),
  z.object({ ...objectiveServingShapes.prediction, ...questionMetadataFields, answerKey: mcqAnswerKeySchema }).strict(),
  z.object({ ...objectiveServingShapes.fill_blank, ...questionMetadataFields, answerKey: fillBlankAnswerKeySchema }).strict(),
  z.object({ ...objectiveServingShapes.matching, ...questionMetadataFields, answerKey: matchingAnswerKeySchema }).strict(),
  ...Object.values(freeResponseServingShapes).map((serving) =>
    z.object({ ...serving, ...questionMetadataFields, rubric: rubricSchema }).strict()),
];

const storedVariants = [
  ...Object.values(objectiveServingShapes).map((serving) =>
    z.object({ ...serving, ...questionMetadataFields }).strict()),
  ...Object.values(freeResponseServingShapes).map((serving) =>
    z.object({ ...serving, ...questionMetadataFields }).strict()),
];

export const questionCandidateSchema = z.discriminatedUnion(
  "kind",
  candidateVariants as [
    typeof candidateVariants[0],
    typeof candidateVariants[1],
    typeof candidateVariants[2],
    typeof candidateVariants[3],
    ...(typeof candidateVariants)[number][],
  ],
);

export const storedQuestionContentSchema = z.discriminatedUnion(
  "kind",
  storedVariants as [(typeof storedVariants)[number], ...(typeof storedVariants)[number][]],
);

export type QuestionCandidate = z.infer<typeof questionCandidateSchema>;
export type StoredQuestionContent = z.infer<typeof storedQuestionContentSchema>;
export type ObjectiveQuestionContent = Extract<StoredQuestionContent, { kind: (typeof objectiveQuestionKinds)[number] }>;
export type FreeResponseQuestionContent = Extract<StoredQuestionContent, { kind: (typeof freeResponseQuestionKinds)[number] }>;
export type QuestionRubric = z.infer<typeof rubricSchema>;

export const isObjectiveQuestionKind = (
  kind: StoredQuestionContent["kind"],
): kind is ObjectiveQuestionContent["kind"] =>
  (objectiveQuestionKinds as readonly string[]).includes(kind);

export const questionFamilyOf = (kind: StoredQuestionContent["kind"]): "objective" | "free_response" =>
  isObjectiveQuestionKind(kind) ? "objective" : "free_response";

// split an LLM candidate into the persisted column payloads
export const splitQuestionCandidate = (candidate: QuestionCandidate) => {
  const rest = { ...candidate } as Record<string, unknown>;
  const answerKey = rest.answerKey ?? {};
  const rubric = rest.rubric ?? {};
  delete rest.answerKey;
  delete rest.rubric;
  return {
    content: rest as StoredQuestionContent,
    answerKey,
    rubric,
    primaryConceptId: candidate.primaryConceptId,
    difficulty: candidate.difficulty,
  };
};

// deterministic objective scoring (spec 064)

export type ObjectiveScoreResult = { correct: boolean; reason: string };

export const normalizeFreeTextAnswer = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?"']+$/, "");

export const scoreObjectiveQuestion = (
  content: ObjectiveQuestionContent,
  answerKey: unknown,
  response: unknown,
): ObjectiveScoreResult => {
  if (content.kind === "mcq" || content.kind === "prediction") {
    const key = mcqAnswerKeySchema.safeParse(answerKey);
    if (!key.success) return { correct: false, reason: "missing_or_invalid_answer_key" };
    if (typeof response !== "string") return { correct: false, reason: "unanswered" };
    return response.trim() === key.data.correctOptionId
      ? { correct: true, reason: "matched" }
      : { correct: false, reason: "incorrect_option" };
  }

  if (content.kind === "fill_blank") {
    const key = fillBlankAnswerKeySchema.safeParse(answerKey);
    if (!key.success) return { correct: false, reason: "missing_or_invalid_answer_key" };
    if (typeof response !== "string") return { correct: false, reason: "unanswered" };
    const normalized = normalizeFreeTextAnswer(response);
    if (normalized === "") return { correct: false, reason: "unanswered" };
    return key.data.acceptedAnswers.some((accepted) => normalizeFreeTextAnswer(accepted) === normalized)
      ? { correct: true, reason: "matched_variant" }
      : { correct: false, reason: "incorrect_answer" };
  }

  const key = matchingAnswerKeySchema.safeParse(answerKey);
  if (!key.success) return { correct: false, reason: "missing_or_invalid_answer_key" };
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    return { correct: false, reason: "unanswered" };
  }
  const submitted = response as Record<string, unknown>;
  const knownRightIds = new Set(content.pairs.map((pair) => pair.rightId));
  for (const solutionPair of key.data.solution) {
    if (!knownRightIds.has(solutionPair.rightId)) return { correct: false, reason: "invalid_solution_reference" };
    const given = submitted[solutionPair.leftId];
    if (typeof given !== "string") return { correct: false, reason: "unanswered_pair" };
    if (given !== solutionPair.rightId) return { correct: false, reason: "incorrect_pairing" };
  }
  const allowedLeftIds = new Set(content.pairs.map((pair) => pair.leftId));
  for (const leftId of Object.keys(submitted)) {
    if (!allowedLeftIds.has(leftId)) return { correct: false, reason: "unknown_left_side" };
  }
  return { correct: true, reason: "all_pairs_matched" };
};

// rubric-based free-response grading contract (spec 065)

export const freeResponseGradeSchema = z.object({
  scores: z.array(
    z.object({
      criterionId: criterionIdSchema,
      awardedPoints: z.number().min(0),
      comment: z.string().trim().optional(),
    }).strict(),
  ),
  missingKeyPoints: z.array(nonEmptyText),
  feedback: nonEmptyText,
}).strict();

export type FreeResponseGrade = z.infer<typeof freeResponseGradeSchema>;

// derived learner-facing result + concept guidance flags (spec 072)

export const questionKindSchema = z.enum([...objectiveQuestionKinds, ...freeResponseQuestionKinds]);

export const gradedQuestionResultSchema = z.object({
  questionId: uuidSchema,
  kind: questionKindSchema,
  correct: z.boolean().nullable(),
  earnedPoints: z.number().min(0),
  possiblePoints: z.number().nonnegative(),
  conceptIds: z.array(uuidSchema),
  weakPoints: z.array(nonEmptyText),
  feedback: nonEmptyText,
}).strict();

export type GradedQuestionResult = z.infer<typeof gradedQuestionResultSchema>;

export const conceptGuidanceFlagFromResults = (
  results: readonly Pick<GradedQuestionResult, "earnedPoints" | "possiblePoints" | "conceptIds">[],
  conceptIds: readonly string[],
): { conceptId: string; flag: "strong" | "review" | "needs_guidance" }[] => conceptIds.map((conceptId) => {
  const related = results.filter((result) => result.conceptIds.includes(conceptId));
  const possible = related.reduce((sum, result) => sum + result.possiblePoints, 0);
  const earned = related.reduce((sum, result) => sum + result.earnedPoints, 0);
  const ratio = possible === 0 ? 1 : earned / possible;
  return {
    conceptId,
    flag: ratio >= 0.8 ? "strong" : ratio >= 0.5 ? "review" : "needs_guidance",
  };
});
