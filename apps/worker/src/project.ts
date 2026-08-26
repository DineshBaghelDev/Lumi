import type { WorkerConfig } from "@lumi/config";
import { type GenerationJobRow, type LumiDb } from "@lumi/db";
import { LiteLlmClient, recordLlmCall, type CompleteResult } from "@lumi/llm";
import { projectContentSchema, type ProjectContent } from "@lumi/shared";
import { sql } from "drizzle-orm";
import { refreshCourseStatus } from "./lesson.ts";
import { PermanentJobError, RetryableJobError } from "./worker.ts";

type ProjectConfig = Pick<WorkerConfig, "services">;
type ProjectLlm = { complete(input: { messages: { role: "system" | "user"; content: string }[]; temperature?: number; maxTokens?: number }): Promise<CompleteResult> };

type ProjectRow = {
  id: string;
  course_id: string;
  course_topic: string;
  course_title: string;
  title: string;
  goal: string;
  status: "pending" | "generating" | "ready" | "failed";
  generation_metadata: { localId?: string; conceptIds?: string[]; lessonIds?: string[] };
};

type MilestoneRow = {
  id: string;
  order_index: number;
  title: string;
  relevant_lesson_ids: string[];
  relevant_concept_ids: string[];
};

type LessonRefRow = { id: string; title: string; objectives: string[] };
type ConceptRefRow = { id: string; name: string; description: string | null };

export type ProjectQcResult = { passed: boolean; reasons: string[] };

export const createProjectHandler = (
  db: LumiDb,
  config: ProjectConfig,
  deps: { llm?: ProjectLlm; reviewer?: ProjectLlm } = {},
) => {
  const llm = deps.llm ?? new LiteLlmClient(config.services.liteLlm);
  const reviewer = deps.reviewer ?? llm;

  return async (job: GenerationJobRow) => {
    if (!job.project_id) throw new PermanentJobError("Project job missing project target");
    const project = await getProject(db, job.project_id);
    await ensureCanContinue(db, project.course_id, "project start");
    if (project.status === "ready") return;

    await setProgress(db, job.id, 10, { stage: "load_context" });
    await setProjectStatus(db, project.id, "generating");
    const context = await getProjectContext(db, project);

    let feedback: string[] = [];
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await setProgress(db, job.id, attempt === 1 ? 30 : 55, { stage: "generate", attempt });
      const generated = await generateProject(llm, project, context, feedback);
      await recordLlmCall(db, {
        jobId: job.id,
        model: generated.result.model,
        promptVersion: "project-v1",
        inputTokens: generated.result.inputTokens,
        outputTokens: generated.result.outputTokens,
        latencyMs: generated.result.latencyMs,
        rawRequestId: generated.result.rawRequestId,
        metadata: { projectId: project.id, attempt },
      });

      const deterministic = validateProjectQuality(generated.content, context);
      const semantic = deterministic.passed ? await reviewProject(reviewer, project, generated.content) : null;
      if (semantic) {
        await recordLlmCall(db, {
          jobId: job.id,
          model: semantic.result.model,
          promptVersion: "project-review-v1",
          inputTokens: semantic.result.inputTokens,
          outputTokens: semantic.result.outputTokens,
          latencyMs: semantic.result.latencyMs,
          rawRequestId: semantic.result.rawRequestId,
          metadata: { projectId: project.id, attempt },
        });
      }

      const qc = mergeQc(deterministic, semantic ?? deterministic);
      if (qc.passed) {
        await setProgress(db, job.id, 85, { stage: "persist" });
        await persistReadyProject(db, job, project, generated.content, qc, attempt);
        await refreshCourseStatus(db, project.course_id);
        return;
      }
      feedback = qc.reasons;
    }

    await setProjectFailed(db, project.id, feedback);
    await refreshCourseStatus(db, project.course_id);
    throw new PermanentJobError(`Project failed QC: ${feedback.join("; ")}`);
  };
};

const getProject = async (db: LumiDb, projectId: string) => {
  const result = await db.execute<ProjectRow>(sql`
    select
      p.id,
      p.course_id,
      c.topic as course_topic,
      c.title as course_title,
      p.title,
      p.goal,
      p.status,
      p.generation_metadata
    from projects p
    join courses c on c.id = p.course_id
    where p.id = ${projectId}
  `);
  const project = result.rows[0];
  if (!project) throw new PermanentJobError("Project not found");
  return project;
};

export type ProjectContext = {
  milestones: MilestoneRow[];
  lessons: LessonRefRow[];
  concepts: ConceptRefRow[];
};

const getProjectContext = async (db: LumiDb, project: ProjectRow): Promise<ProjectContext> => {
  const milestones = (await db.execute<MilestoneRow>(sql`
    select id, order_index, title, relevant_lesson_ids, relevant_concept_ids
    from project_milestones
    where project_id = ${project.id}
    order by order_index
  `)).rows;
  if (milestones.length === 0) throw new PermanentJobError("Project has no milestone skeletons");

  const lessonIds = [...new Set(milestones.flatMap((milestone) => milestone.relevant_lesson_ids))];
  const lessons = lessonIds.length
    ? (await db.execute<LessonRefRow>(sql`
      select id, title, objectives
      from lessons
      where id = any(${pgUuidArray(lessonIds)}::uuid[])
      order by title
    `)).rows
    : [];

  const conceptIds = [...new Set(milestones.flatMap((milestone) => milestone.relevant_concept_ids))];
  const concepts = conceptIds.length
    ? (await db.execute<ConceptRefRow>(sql`
      select id, name, description
      from concepts
      where id = any(${pgUuidArray(conceptIds)}::uuid[])
      order by name
    `)).rows
    : [];

  return { milestones, lessons, concepts };
};

const generateProject = async (
  llm: ProjectLlm,
  project: ProjectRow,
  context: ProjectContext,
  feedback: string[],
) => {
  const result = await llm.complete({
    temperature: 0.2,
    maxTokens: 5_000,
    messages: [
      { role: "system", content: "Return only valid JSON for Lumi guided-project schema version 1. No HTML." },
      { role: "user", content: buildProjectPrompt(project, context, feedback) },
    ],
  }).catch((error: unknown) => {
    throw error instanceof Error && /rate.?limit|timeout|network|5\d\d/i.test(error.message)
      ? new RetryableJobError(error.message)
      : error;
  });

  try {
    return { result, content: projectContentSchema.parse(JSON.parse(result.content)) };
  } catch (error) {
    throw new PermanentJobError(error instanceof Error ? `Invalid project output: ${error.message}` : "Invalid project output");
  }
};

const buildProjectPrompt = (project: ProjectRow, context: ProjectContext, feedback: string[]) => JSON.stringify({
  task: [
    "Generate one complete guided project the learner runs in their own local development environment.",
    "Build a realistic mission/story framing around the project goal; light flavor is fine but engineering must stay primary.",
    "Teach implementation competence, never code review or testing inside an app.",
    "Progress progressively: each milestone poses a problem, invites a learner decision, then a concrete local implementation step, and ends by revealing a new limitation that motivates the next milestone.",
    "Use only the listed concepts and lessons. Keep only a small number of genuinely new ideas per milestone.",
    "Hints must escalate conceptual -> structural -> implementation and never hand over a full solution.",
  ].join(" "),
  course: { title: project.course_title, topic: project.course_topic },
  project: { title: project.title, goal: project.goal },
  previousFeedback: feedback,
  allowedConcepts: context.concepts.map((concept) => ({
    id: concept.id,
    name: concept.name,
    description: concept.description,
  })),
  availableLessons: context.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    objectives: lesson.objectives,
  })),
  skeletonMilestones: context.milestones.map((milestone) => ({
    orderIndex: milestone.order_index,
    title: milestone.title,
    relevantConceptIds: milestone.relevant_concept_ids,
    relevantLessonIds: milestone.relevant_lesson_ids,
  })),
  output: {
    format: "Return only a single JSON object matching this exact shape. Every milestone orderIndex must match a skeletonMilestones entry exactly once, ascending from 1. relevantConceptIds/relevantLessonIds must use ONLY UUIDs listed above for that milestone (or other listed ids). hints contain 1-4 items whose levels never go backwards and never start at implementation.",
    shape: {
      schemaVersion: 1,
      storyline: "<one paragraph mission/premise>",
      teachingProgression: ["<problem statement>", "<learner choice>", "<local implementation>", "<new limitation>"],
      milestones: [
        {
          orderIndex: 1,
          scenario: "<concrete scenario with enough context for a beginner working locally>",
          learnerDecisionPrompt: "<optional question inviting a learner decision>",
          implementationGoal: "<what the learner builds locally in this milestone>",
          constraints: ["<rule or limitation to respect>"],
          expectedOutcome: "<observable result when the milestone is done>",
          relevantConceptIds: ["<concept uuid>"],
          relevantLessonIds: ["<lesson uuid>"],
          hints: [
            { level: "conceptual", text: "<conceptual nudge>" },
            { level: "structural", text: "<structural nudge>" },
            { level: "implementation", text: "<implementation-level nudge, still not a full solution>" },
          ],
        },
      ],
    },
  },
});

export const validateProjectQuality = (content: ProjectContent, context: ProjectContext): ProjectQcResult => {
  const reasons: string[] = [];
  const skeletons = [...context.milestones].sort((a, b) => a.order_index - b.order_index);
  const knownConceptIds = new Set(context.concepts.map((concept) => concept.id));
  const knownLessonIds = new Set(context.lessons.map((lesson) => lesson.id));

  content.milestones.forEach((milestone, index) => {
    const skeleton = skeletons[index];
    if (!skeleton || milestone.orderIndex !== skeleton.order_index) {
      reasons.push(`milestone ${index + 1} does not match the project skeleton`);
      return;
    }
    const words = (text: string) => text.toLowerCase().match(/[a-z0-9-]{3,}/g) ?? [];
    if (words(milestone.scenario).length < 15) reasons.push(`milestone ${skeleton.order_index} scenario is too thin for a beginner`);
    if (words(milestone.expectedOutcome).length < 6) reasons.push(`milestone ${skeleton.order_index} expected outcome is too thin`);

    if (milestone.relevantConceptIds.some((id) => !knownConceptIds.has(id))) {
      reasons.push(`milestone ${skeleton.order_index} references untaught concepts`);
    }
    if (milestone.relevantLessonIds.some((id) => !knownLessonIds.has(id))) {
      reasons.push(`milestone ${skeleton.order_index} references unknown lessons`);
    }
    const referencedSkeletonLessons = new Set(skeleton.relevant_lesson_ids);
    if (
      referencedSkeletonLessons.size > 0 &&
      !milestone.relevantLessonIds.some((id) => referencedSkeletonLessons.has(id))
    ) {
      reasons.push(`milestone ${skeleton.order_index} ignores its planned lesson links`);
    }

    const lastHint = milestone.hints[milestone.hints.length - 1];
    const solutionish = /\b(full|complete|entire)\b.*\bsolution\b/i.test(lastHint?.text ?? "");
    if (solutionish) reasons.push(`milestone ${skeleton.order_index} final hint reveals a full solution`);
  });

  if ((content.storyline.match(/as an ai language model/g) ?? []).length > 0) {
    reasons.push("robotic filler detected");
  }

  return { passed: reasons.length === 0, reasons: reasons.length ? reasons : [] };
};

const reviewProject = async (reviewer: ProjectLlm, project: ProjectRow, content: ProjectContent) => {
  const result = await reviewer.complete({
    temperature: 0,
    maxTokens: 900,
    messages: [
      { role: "system", content: "Return JSON only: {\"passed\": boolean, \"reasons\": string[]}. Check pedagogy, progressive difficulty, hint ordering, and that no milestone dumps the entire project or requires untaught material." },
      { role: "user", content: JSON.stringify({ project: { title: project.title, goal: project.goal }, content }) },
    ],
  });
  return { result, ...parseReviewerResult(result.content) };
};

const parseReviewerResult = (content: string): ProjectQcResult => {
  try {
    const parsed = JSON.parse(content) as { passed?: unknown; reasons?: unknown };
    return {
      passed: parsed.passed === true,
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.filter((item): item is string => typeof item === "string" && item.trim() !== "")
        : [],
    };
  } catch {
    return { passed: false, reasons: ["reviewer returned invalid JSON"] };
  }
};

const mergeQc = (a: ProjectQcResult, b: ProjectQcResult): ProjectQcResult => ({
  passed: a.passed && b.passed,
  reasons: [...a.reasons, ...b.reasons],
});

const persistReadyProject = async (
  db: LumiDb,
  job: GenerationJobRow,
  project: ProjectRow,
  content: ProjectContent,
  qc: ProjectQcResult,
  attempt: number,
) => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update projects
      set status = 'ready',
          storyline = ${content.storyline},
          generation_metadata = generation_metadata || ${JSON.stringify({ projectJobId: job.id, schemaVersion: content.schemaVersion, teachingProgression: content.teachingProgression, qc, attempts: attempt })}::jsonb,
          updated_at = now()
      where id = ${project.id}
    `);
    for (const milestone of content.milestones) {
      await tx.execute(sql`
        update project_milestones
        set scenario = ${milestone.scenario},
            prompt = ${milestone.learnerDecisionPrompt ?? ""},
            implementation_goal = ${milestone.implementationGoal},
            constraints = ${JSON.stringify(milestone.constraints)}::jsonb,
            hints = ${JSON.stringify(milestone.hints)}::jsonb,
            expected_outcome = ${milestone.expectedOutcome},
            relevant_lesson_ids = ${JSON.stringify(milestone.relevantLessonIds)}::jsonb,
            relevant_concept_ids = ${JSON.stringify(milestone.relevantConceptIds)}::jsonb,
            generation_metadata = generation_metadata || ${JSON.stringify({ projectJobId: job.id })}::jsonb
        where project_id = ${project.id} and order_index = ${milestone.orderIndex}
      `);
    }
    await setProgress(tx as LumiDb, job.id, 95, { stage: "ready" });
  });
};

const ensureCanContinue = async (db: LumiDb, courseId: string, stage: string) => {
  const result = await db.execute<{ cancel_requested_at: Date | null; budget_exhausted_at: Date | null }>(sql`
    select cancel_requested_at, budget_exhausted_at
    from course_generation_usage
    where course_id = ${courseId}
  `);
  const usage = result.rows[0];
  if (usage?.cancel_requested_at) throw new PermanentJobError(`Course generation cancelled at ${stage}`);
  if (usage?.budget_exhausted_at) throw new PermanentJobError(`Course generation budget exhausted at ${stage}`);
};

const setProjectStatus = async (db: LumiDb, projectId: string, status: "generating") => {
  await db.execute(sql`update projects set status = ${status}, updated_at = now() where id = ${projectId} and status <> 'ready'`);
};

const setProjectFailed = async (db: LumiDb, projectId: string, reasons: string[]) => {
  await db.execute(sql`
    update projects
    set status = 'failed',
        generation_metadata = generation_metadata || ${JSON.stringify({ qcFailureReasons: reasons })}::jsonb,
        updated_at = now()
    where id = ${projectId}
  `);
};

const setProgress = async (db: LumiDb, jobId: string, progress: number, metadata: Record<string, unknown>) => {
  await db.execute(sql`
    update generation_jobs
    set progress = ${progress},
        metadata = metadata || ${JSON.stringify(metadata)}::jsonb,
        updated_at = now()
    where id = ${jobId} and status = 'running'
  `);
};

const pgUuidArray = (ids: readonly string[]) => `{${ids.join(",")}}`;
