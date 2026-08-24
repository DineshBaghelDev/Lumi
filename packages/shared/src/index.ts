import { z } from "zod";

const localIdSchema = z.string().trim().regex(/^[a-z][a-z0-9-]*$/, {
  message: "must be a lowercase stable id such as module-1",
});
const uuidSchema = z.uuid();
const nonEmptyText = z.string().trim().min(1);
const orderIndexSchema = z.number().int().positive();

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
  requiredPrerequisiteConceptIds: z.array(uuidSchema),
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
