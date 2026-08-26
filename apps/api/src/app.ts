import { parseApiEnv, type ApiConfig } from "@lumi/config";
import {
  canAccessCourse,
  cancelCourseGeneration,
  checkDbConnection,
  createApiDbClient,
  createCourseWithResearchJob,
  manualRetryGenerationJob,
  type LumiDb,
} from "@lumi/db";
import { LiteLlmClient, recordLlmCall, type CompleteResult } from "@lumi/llm";
import {
  conceptGuidanceFlagFromResults,
  freeResponseGradeSchema,
  isObjectiveQuestionKind,
  lessonContentSchema,
  rubricSchema,
  scoreObjectiveQuestion,
  storedQuestionContentSchema,
  type FreeResponseQuestionContent,
  type ObjectiveQuestionContent,
  type ProjectHint,
  type StoredQuestionContent,
} from "@lumi/shared";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { createInsforgeTokenVerifier, HttpError, registerAuth, type TokenVerifier } from "./auth.ts";

type GraderLlm = { complete(input: { messages: { role: "system" | "user"; content: string }[]; temperature?: number; maxTokens?: number }): Promise<CompleteResult> };

type AppDeps = {
  config?: ApiConfig;
  db?: LumiDb;
  verifyToken?: TokenVerifier;
  grader?: GraderLlm;
};

const createCourseBody = z.object({
  topic: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(1000),
  targetAudience: z.string().trim().min(1).max(200).optional(),
  difficultyLevel: z.string().trim().min(1).max(80).optional(),
});

const paramsWithId = z.object({ id: z.uuid() });

const questionResponseSchema = z.union([z.string().max(8_000), z.record(z.string(), z.string().max(8_000))]);
const objectiveScoreBody = z.object({ questionId: z.uuid(), response: questionResponseSchema });
const submitAnswersBody = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        response: questionResponseSchema,
      }).strict(),
    )
    .min(1),
});

type GenerationJobDto = {
  id: string;
  type: string;
  status: string;
  progress: number;
  attempts: number;
  stage: string;
  canRetry: boolean;
  message: string | null;
};

const safeJobMessage = (job: { status: string; error: string | null }) => {
  if (job.status === "failed") return "Generation failed. You can retry this step.";
  if (job.status === "cancelled") return "Generation was cancelled.";
  return null;
};

const jobStage = (type: string) =>
  ({
    research: "Researching sources",
    curriculum: "Building curriculum",
    lesson: "Writing lessons",
    project: "Preparing projects",
    question: "Preparing assessments",
  })[type] ?? "Generating";

const toGenerationJobDto = (job: {
  id: string;
  type: string;
  status: string;
  progress: number;
  attempts: number;
  error: string | null;
}): GenerationJobDto => ({
  id: job.id,
  type: job.type,
  status: job.status,
  progress: job.progress,
  attempts: job.attempts,
  stage: jobStage(job.type),
  canRetry: job.status === "failed",
  message: safeJobMessage(job),
});

const parse = <T>(schema: z.ZodType<T>, value: unknown) => {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, "bad_request", result.error.issues[0]?.message ?? "Invalid request");
  return result.data;
};

export const createApp = (deps: AppDeps = {}): FastifyInstance => {
  const config = deps.config ?? parseApiEnv(process.env);
  const db = deps.db ?? createApiDbClient(config);
  const grader = deps.grader ?? new LiteLlmClient(config.services.liteLlm);
  const app = Fastify({ logger: true });

  registerAuth(app, db, deps.verifyToken ?? createInsforgeTokenVerifier(config));

  app.setErrorHandler((error, request, reply) => {
    const rawStatus = error instanceof HttpError ? error.statusCode : (error as { statusCode?: unknown }).statusCode;
    const statusCode = error instanceof HttpError
      ? error.statusCode
      : typeof rawStatus === "number" && rawStatus >= 400 && rawStatus < 500
        ? rawStatus
        : 500;
    request.log[statusCode >= 500 ? "error" : "warn"](error);
    const message = error instanceof Error ? error.message : "Invalid request";
    void reply.status(statusCode).send({
      error: {
        code: error instanceof HttpError ? error.code : "internal_error",
        message: statusCode >= 500 ? "Internal server error" : message,
      },
    });
  });

  app.get("/health", async () => {
    await checkDbConnection(db);
    return { ok: true };
  });

  app.post("/courses", { preHandler: app.requireAuth }, async (request, reply) => {
    const body = parse(createCourseBody, request.body);
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
      throw new HttpError(400, "missing_idempotency_key", "Idempotency-Key header is required");
    }
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");

    const result = await createCourseWithResearchJob(db, {
      user,
      idempotencyKey,
      topic: body.topic,
      goal: body.goal,
      targetAudience: body.targetAudience ?? null,
      difficultyLevel: body.difficultyLevel ?? null,
      limits: config.generationBudgets,
    });

    return reply.status(201).send(result);
  });

  app.get("/courses", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const rows = await db.execute(sql`
      select c.id, c.title, c.topic, c.description, c.status, c.created_at
      from courses c
      join enrollments e on e.course_id = c.id
      where e.user_id = ${user.id} and e.status = 'active'
      order by c.created_at desc
    `);
    return { courses: rows.rows };
  });

  app.get("/courses/:id", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    if (!(await canAccessCourse(db, user.id, id))) throw new HttpError(404, "not_found", "Course not found");

    const course = await db.execute(sql`select * from courses where id = ${id}`);
    const includeJobs = request.query && (request.query as { include?: string }).include === "jobs";
    const jobs = includeJobs
      ? (await db.execute<{
        id: string;
        type: string;
        status: string;
        progress: number;
        attempts: number;
        error: string | null;
      }>(sql`
        select id, type, status, progress, attempts, error
        from generation_jobs
        where course_id = ${id}
        order by created_at
      `)).rows.map(toGenerationJobDto)
      : undefined;
    const usage = includeJobs
      ? (await db.execute(sql`
        select cancel_requested_at is not null as cancelled,
               budget_exhausted_at is not null as budget_exhausted
        from course_generation_usage
        where course_id = ${id}
      `)).rows[0] ?? null
      : undefined;
    return { course: course.rows[0], jobs, usage };
  });

  app.post("/generation-jobs/:id/retry", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const found = (await db.execute<{
      id: string;
      course_id: string;
      type: string;
      status: string;
      progress: number;
      attempts: number;
      error: string | null;
    }>(sql`
      select id, course_id, type, status, progress, attempts, error
      from generation_jobs
      where id = ${id}
    `)).rows[0];
    if (!found || !(await canAccessCourse(db, user.id, found.course_id))) {
      throw new HttpError(404, "not_found", "Generation job not found");
    }
    if (found.status !== "failed") {
      throw new HttpError(409, "invalid_job_state", "Only failed generation jobs can be retried");
    }

    const retried = await manualRetryGenerationJob(db, id);
    if (retried.type === "research" || retried.type === "curriculum") {
      await db.execute(sql`update courses set status = 'generating', updated_at = now() where id = ${retried.course_id}`);
    }
    return { job: toGenerationJobDto(retried) };
  });

  app.post("/courses/:id/cancel-generation", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const result = await cancelCourseGeneration(db, { userId: user.id, courseId: id });
    if (!result) throw new HttpError(404, "not_found", "Course not found");
    return result;
  });

  app.get("/courses/:id/curriculum", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    if (!(await canAccessCourse(db, user.id, id))) throw new HttpError(404, "not_found", "Course not found");
    const curriculum = (await db.execute(sql`select * from curricula where course_id = ${id}`)).rows[0] ?? null;
    const modules = curriculum
      ? (await db.execute(sql`
        select m.*
        from modules m
        where m.curriculum_id = ${(curriculum as { id: string }).id}
        order by m.order_index
      `)).rows
      : [];
    const lessons = curriculum
      ? (await db.execute(sql`
        select l.*, m.order_index as module_order_index, a.id as assessment_id, a.status as assessment_status
        from lessons l
        join modules m on m.id = l.module_id
        left join assessments a on a.lesson_id = l.id
        where m.curriculum_id = ${(curriculum as { id: string }).id}
        order by m.order_index, l.order_index
      `)).rows
      : [];
    const projects = curriculum
      ? (await db.execute(sql`
        select p.*, coalesce(
          json_agg(pm order by pm.order_index) filter (where pm.id is not null),
          '[]'::json
        ) as milestones
        from projects p
        left join project_milestones pm on pm.project_id = p.id
        where p.curriculum_id = ${(curriculum as { id: string }).id}
        group by p.id
        order by p.created_at
      `)).rows
      : [];
    return { curriculum, modules, lessons, projects };
  });

  app.get("/courses/:id/lessons", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    if (!(await canAccessCourse(db, user.id, id))) throw new HttpError(404, "not_found", "Course not found");
    const rows = await db.execute(sql`
      select l.*, a.id as assessment_id, a.status as assessment_status
      from lessons l
      join modules m on m.id = l.module_id
      join curricula c on c.id = m.curriculum_id
      left join assessments a on a.lesson_id = l.id
      where c.course_id = ${id}
      order by m.order_index, l.order_index
    `);
    return { lessons: rows.rows };
  });

  app.get("/lessons/:id", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const rows = await db.execute(sql`
      select l.*, c.course_id, a.id as assessment_id, a.status as assessment_status
      from lessons l
      join modules m on m.id = l.module_id
      join curricula c on c.id = m.curriculum_id
      left join assessments a on a.lesson_id = l.id
      where l.id = ${id}
    `);
    const lesson = rows.rows[0] as ({ course_id: string } & Record<string, unknown>) | undefined;
    if (!lesson || !(await canAccessCourse(db, user.id, lesson.course_id))) {
      throw new HttpError(404, "not_found", "Lesson not found");
    }
    const parsedContent = lesson.content_json ? lessonContentSchema.safeParse(lesson.content_json) : null;
    if (lesson.content_json && !parsedContent?.success) {
      throw new HttpError(500, "invalid_lesson_content", "Stored lesson content is invalid");
    }
    const assetIds = parsedContent?.success
      ? parsedContent.data.blocks.flatMap((block) => block.type === "image" ? [block.assetId] : [])
      : [];
    const assets = assetIds.length
      ? (await db.execute(sql`
        select id, title, description, alt_text, storage_path, mime_type
        from assets
        where course_id = ${lesson.course_id}
          and id = any(${pgUuidArray(assetIds)}::uuid[])
      `)).rows
      : [];
    return { lesson: { ...lesson, content_json: parsedContent?.success ? parsedContent.data : null }, assets };
  });

  app.get("/assessments/:id", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const assessment = (await db.execute<{
      id: string;
      title: string;
      status: string;
      lesson_id: string;
      course_id: string;
    }>(sql`
      select a.id, a.title, a.status, l.id as lesson_id, c.course_id
      from assessments a
      join lessons l on l.id = a.lesson_id
      join modules m on m.id = l.module_id
      join curricula c on c.id = m.curriculum_id
      where a.id = ${id}
    `)).rows[0];
    if (!assessment || !(await canAccessCourse(db, user.id, assessment.course_id))) {
      throw new HttpError(404, "not_found", "Assessment not found");
    }

    const questions = assessment.status === "ready"
      ? await serveQuestions(db, id)
      : [];
    const latestAttempt = (await db.execute<{ id: string; score: number | null; results: unknown; submitted_at: string }>(sql`
      select id, score, results, submitted_at
      from assessment_attempts
      where assessment_id = ${id} and user_id = ${user.id} and status = 'graded'
      order by submitted_at desc
      limit 1
    `)).rows[0] ?? null;

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        lessonId: assessment.lesson_id,
        courseId: assessment.course_id,
      },
      questions,
      latestAttempt,
    };
  });

  app.post("/assessments/:id/objective-score", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const body = parse(objectiveScoreBody, request.body);
    const found = (await db.execute<{ answer_key: unknown; content: unknown; type: string; course_id: string }>(sql`
      select q.answer_key, q.content, q.type, cu.course_id
      from questions q
      join assessment_questions aq on aq.question_id = q.id
      join assessments a on a.id = aq.assessment_id
      join lessons l on l.id = a.lesson_id
      join modules m on m.id = l.module_id
      join curricula cu on cu.id = m.curriculum_id
      where aq.assessment_id = ${id} and q.id = ${body.questionId} and a.status = 'ready'
    `)).rows[0];
    if (!found) throw new HttpError(404, "not_found", "Question not found in this assessment");
    if (!(await canAccessCourse(db, user.id, found.course_id))) {
      throw new HttpError(404, "not_found", "Question not found in this assessment");
    }

    const contentResult = storedQuestionContentSchema.safeParse(found.content);
    if (!contentResult.success) throw new HttpError(500, "invalid_question_content", "Stored question is invalid");
    const content = contentResult.data;
    if (content.kind !== "mcq") {
      throw new HttpError(400, "unsupported_feedback", "Immediate feedback is only available for multiple-choice questions");
    }
    return scoreObjectiveQuestion(content, found.answer_key, body.response);
  });

  app.post("/assessments/:id/submissions", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const body = parse(submitAnswersBody, request.body);

    const questions = (await db.execute<{
      id: string;
      content: unknown;
      answer_key: unknown;
      rubric: unknown;
      order_index: number;
      course_id: string;
    }>(sql`
      select q.id, q.content, q.answer_key, q.rubric, aq.order_index, cu.course_id
      from questions q
      join assessment_questions aq on aq.question_id = q.id
      join assessments a on a.id = aq.assessment_id
      join lessons l on l.id = a.lesson_id
      join modules m on m.id = l.module_id
      join curricula cu on cu.id = m.curriculum_id
      where aq.assessment_id = ${id} and a.status = 'ready'
      order by aq.order_index
    `)).rows;
    if (questions.length === 0) throw new HttpError(404, "not_found", "This assessment has no questions yet");
    if (!(await canAccessCourse(db, user.id, questions[0]!.course_id))) {
      throw new HttpError(404, "not_found", "This assessment has no questions yet");
    }

    const contents = questions.map((question) => {
      const parsed = storedQuestionContentSchema.safeParse(question.content);
      if (!parsed.success) throw new HttpError(500, "invalid_question_content", "Stored question is invalid");
      return { row: question, content: parsed.data };
    });

    const answersByQuestion = new Map(body.answers.map((entry) => [entry.questionId, entry.response]));
    const conceptLinks = (await db.execute<{ question_id: string; concept_id: string }>(sql`
      select qc.question_id, qc.concept_id
      from question_concepts qc
      where qc.question_id = any(${pgUuidArray(questions.map((question) => question.id))}::uuid[])
    `)).rows;

    const results: GradedQuestionResultLike[] = [];
    for (const { row, content } of contents) {
      const response = answersByQuestion.get(row.id);
      const conceptIds = conceptLinks.filter((link) => link.question_id === row.id).map((link) => link.concept_id);
      if (isObjectiveContent(content)) {
        const scored = scoreObjectiveQuestion(content, row.answer_key, response);
        results.push({
          questionId: row.id,
          kind: content.kind,
          correct: scored.correct,
          earnedPoints: scored.correct ? 1 : 0,
          possiblePoints: 1,
          conceptIds,
          weakPoints: scored.correct ? [] : [`Objective question answered incorrectly (${scored.reason}).`],
          feedback: scored.correct ? "Correct." : objectiveFeedback(scored.reason),
        });
      } else {
        const grade = await gradeFreeResponse(grader, db, content, row.rubric, typeof response === "string" ? response : "");
        results.push({
          questionId: row.id,
          kind: content.kind,
          correct: null,
          earnedPoints: grade.earnedPoints,
          possiblePoints: grade.possiblePoints,
          conceptIds,
          weakPoints: grade.weakPoints,
          feedback: grade.feedback,
        });
      }
    }

    const earned = results.reduce((sum, result) => sum + result.earnedPoints, 0);
    const possible = results.reduce((sum, result) => sum + result.possiblePoints, 0);
    const score = possible > 0 ? earned / possible : 0;

    const attempt = (await db.execute<{ id: string }>(sql`
      insert into assessment_attempts (assessment_id, user_id, status, answers, results, score, submitted_at, graded_at)
      values (${id}, ${user.id}, 'graded', ${JSON.stringify(Object.fromEntries([...answersByQuestion]))}::jsonb, ${JSON.stringify({ questions: results })}::jsonb, ${score}, now(), now())
      returning id
    `)).rows[0];

    for (const guidance of conceptGuidanceFlagFromResults(results, [...new Set(results.flatMap((result) => result.conceptIds))])) {
      const issue = results.find(
        (result) => guidance.flag === "needs_guidance" && result.conceptIds.includes(guidance.conceptId),
      )?.weakPoints[0] ?? null;
      await db.execute(sql`
        insert into concept_progress (user_id, concept_id, status, last_issue)
        values (${user.id}, ${guidance.conceptId}, ${guidance.flag}, ${issue})
        on conflict (user_id, concept_id) do update
          set status = excluded.status, last_issue = excluded.last_issue, updated_at = now()
      `);
    }

    return { attempt: { id: attempt?.id ?? null, score, earned, possible }, results };
  });

  app.get("/projects/:id", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const projectRow = (await db.execute<{ id: string; course_id: string }>(sql`select id, course_id from projects where id = ${id}`)).rows[0];
    if (!projectRow || !(await canAccessCourse(db, user.id, projectRow.course_id))) {
      throw new HttpError(404, "not_found", "Project not found");
    }
    return serveProject(db, user.id, id);
  });

  app.post("/projects/:id/hints/reveal", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    const context = await loadProjectForUser(db, user.id, id);
    const current = currentMilestoneOf(context.milestones, context.progress);
    if (!current) throw new HttpError(409, "project_completed", "Every milestone in this project is already complete");

    const hints = asHintArray(current.hints);
    const progress = await upsertProjectProgress(db, user.id, id, current.id);
    if (progress.status === "completed") throw new HttpError(409, "project_completed", "This project is already complete");
    if ((progress.hints_revealed_count ?? 0) >= hints.length) {
      return { revealedHints: hints.length, hintCount: hints.length, hint: hints[hints.length - 1] ?? null, noMoreHints: true };
    }
    const revealedCount = Math.min((progress.hints_revealed_count ?? 0) + 1, hints.length);
    await db.execute(sql`
      update project_progress
      set hints_revealed_count = ${revealedCount}, status = 'in_progress', updated_at = now()
      where user_id = ${user.id} and project_id = ${id}
    `);
    return {
      revealedHints: revealedCount,
      hintCount: hints.length,
      hint: hints[revealedCount - 1] ?? null,
      noMoreHints: revealedCount >= hints.length,
    };
  });

  app.post("/projects/:id/milestones/:milestoneId/complete", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const params = parse(z.object({ id: z.uuid(), milestoneId: z.uuid() }), request.params);
    const context = await loadProjectForUser(db, user.id, params.id);
    const ordered = [...context.milestones].sort((a, b) => a.order_index - b.order_index);
    const current = currentMilestoneOf(context.milestones, context.progress);
    if (!current) throw new HttpError(409, "project_completed", "Every milestone in this project is already complete");
    if (current.id !== params.milestoneId) {
      throw new HttpError(409, "out_of_order_milestone", "Only the current milestone can be completed");
    }
    const next = ordered.find((milestone) => milestone.order_index > current.order_index);
    const updated = await db.execute<{ status: string; next_milestone_id: string | null }>(sql`
      insert into project_progress (user_id, project_id, current_milestone_id, status)
      values (${user.id}, ${params.id}, ${next?.id ?? null}, ${next ? "in_progress" : "completed"})
      on conflict (user_id, project_id) do update
        set current_milestone_id = ${next?.id ?? null},
            status = ${next ? "in_progress" : "completed"},
            hints_revealed_count = 0,
            updated_at = now()
      returning status, current_milestone_id as next_milestone_id
    `);
    return {
      progressStatus: updated.rows[0]?.status ?? (next ? "in_progress" : "completed"),
      nextMilestoneId: next?.id ?? null,
    };
  });

  app.addHook("onClose", async () => {
    const pool = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client;
    await pool?.end?.();
  });

  return app;
};

const pgUuidArray = (ids: readonly string[]) => `{${ids.join(",")}}`;

type GradedQuestionResultLike = {
  questionId: string;
  kind: StoredQuestionContent["kind"];
  correct: boolean | null;
  earnedPoints: number;
  possiblePoints: number;
  conceptIds: string[];
  weakPoints: string[];
  feedback: string;
};

type ProjectMilestoneDbRow = {
  id: string;
  order_index: number;
  title: string;
  scenario: string;
  prompt: string;
  implementation_goal: string;
  constraints: unknown;
  hints: unknown;
  expected_outcome: string;
  relevant_lesson_ids: unknown;
};

type ProjectProgressRow = {
  status: "not_started" | "in_progress" | "completed";
  current_milestone_id: string | null;
  hints_revealed_count: number | null;
};

const isObjectiveContent = (content: StoredQuestionContent): content is ObjectiveQuestionContent =>
  isObjectiveQuestionKind(content.kind);

const objectiveFeedback = (reason: string) =>
  ({
    unanswered: "No answer was selected for this question.",
    incorrect_option: "Not quite. Re-check the lesson section covering this idea.",
    unknown_reason: "Review this concept in the lesson before moving on.",
  })[reason === "unanswered" ? "unanswered" : reason === "incorrect_option" ? "incorrect_option" : "unknown_reason"];

const gradeFreeResponse = async (
  grader: GraderLlm,
  db: LumiDb,
  content: FreeResponseQuestionContent,
  rubricJson: unknown,
  response: string,
) => {
  const rubricResult = rubricSchema.safeParse(rubricJson);
  if (!rubricResult.success) throw new HttpError(500, "invalid_question_rubric", "Stored question rubric is invalid");
  const rubric = rubricResult.data;
  if (response.trim() === "") {
    return {
      earnedPoints: 0,
      possiblePoints: rubric.pointsTotal,
      weakPoints: [...rubric.keyPoints],
      feedback: "No answer was submitted for this question.",
    };
  }

  let result: CompleteResult;
  try {
    result = await grader.complete({
      temperature: 0,
      maxTokens: 1_200,
      messages: [
        {
          role: "system",
          content:
            'Return JSON only, exactly: {"scores":[{"criterionId":"<id>","awardedPoints":<number>,"comment":"<optional>"}],"missingKeyPoints":["<point>"],"feedback":"<specific guidance>"}. Grade against the rubric only. Give partial credit for correct reasoning even when wording differs and ignore pseudocode syntax differences. Feedback must name concrete conceptual gaps.',
        },
        { role: "user", content: JSON.stringify({ question: content, rubric, answer: response }) },
      ],
    });
  } catch {
    throw new HttpError(502, "grading_failed", "Free-response grading is unavailable right now");
  }
  await recordLlmCall(db, {
    jobId: null,
    model: result.model,
    promptVersion: "question-grading-v1",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
    rawRequestId: result.rawRequestId,
    metadata: { mode: "rubric-grading", kind: content.kind },
  });

  const parsed = freeResponseGradeSchema.safeParse(JSON.parse(result.content));
  if (!parsed.success) throw new HttpError(502, "grading_failed", "Free-response grading returned an invalid result");
  const grade = parsed.data;
  const awardedByCriterion = new Map(grade.scores.map((score) => [score.criterionId, score]));
  let earned = 0;
  const weakPoints: string[] = [];
  for (const criterion of rubric.criteria) {
    const awarded = Math.min(
      criterion.points,
      Math.max(0, awardedByCriterion.get(criterion.id)?.awardedPoints ?? 0),
    );
    earned += awarded;
    if (awarded < criterion.points) weakPoints.push(criterion.description);
  }
  return {
    earnedPoints: earned,
    possiblePoints: rubric.pointsTotal,
    weakPoints: [...new Set([...weakPoints, ...grade.missingKeyPoints])],
    feedback: grade.feedback,
  };
};

const serveQuestions = async (db: LumiDb, assessmentId: string) => {
  const rows = (await db.execute<{ id: string; content: unknown }>(sql`
    select q.id, q.content
    from assessment_questions aq
    join questions q on q.id = aq.question_id
    where aq.assessment_id = ${assessmentId}
    order by aq.order_index
  `)).rows;
  return rows.map((row) => {
    const parsed = storedQuestionContentSchema.safeParse(row.content);
    if (!parsed.success) throw new HttpError(500, "invalid_question_content", "Stored question is invalid");
    return { questionId: row.id, ...parsed.data };
  });
};

const loadProjectForUser = async (
  db: LumiDb,
  userId: string,
  projectId: string,
): Promise<{
  project: { id: string; title: string; goal: string; storyline: string | null; status: string; course_id: string };
  milestones: ProjectMilestoneDbRow[];
  progress: ProjectProgressRow | null;
}> => {
  const projectRow = (await db.execute<{
    id: string;
    title: string;
    goal: string;
    storyline: string | null;
    status: string;
    course_id: string;
  }>(sql`select id, title, goal, storyline, status, course_id from projects where id = ${projectId}`)).rows[0];
  if (!projectRow || !(await canAccessCourse(db, userId, projectRow.course_id))) {
    throw new HttpError(404, "not_found", "Project not found");
  }
  const milestones = (await db.execute<ProjectMilestoneDbRow>(sql`
    select id, order_index, title, scenario, prompt, implementation_goal, constraints, hints, expected_outcome, relevant_lesson_ids
    from project_milestones
    where project_id = ${projectId}
    order by order_index
  `)).rows;
  const progress = (await db.execute<ProjectProgressRow>(sql`
    select status, current_milestone_id, hints_revealed_count
    from project_progress
    where user_id = ${userId} and project_id = ${projectId}
  `)).rows[0] ?? null;
  return { project: projectRow, milestones, progress };
};

const currentMilestoneOf = (
  milestones: readonly ProjectMilestoneDbRow[],
  progress: ProjectProgressRow | null,
): ProjectMilestoneDbRow | null => {
  const ordered = [...milestones].sort((a, b) => a.order_index - b.order_index);
  if (ordered.length === 0) return null;
  if (progress?.status === "completed") return null;
  if (progress?.current_milestone_id) {
    return ordered.find((milestone) => milestone.id === progress.current_milestone_id)
      ?? ordered[0] as ProjectMilestoneDbRow;
  }
  return ordered[0] as ProjectMilestoneDbRow;
};

const upsertProjectProgress = async (
  db: LumiDb,
  userId: string,
  projectId: string,
  currentMilestoneId: string,
): Promise<ProjectProgressRow> => {
  const existing = (await db.execute<ProjectProgressRow>(sql`
    select status, current_milestone_id, hints_revealed_count
    from project_progress
    where user_id = ${userId} and project_id = ${projectId}
  `)).rows[0];
  if (existing) return existing;
  await db.execute(sql`
    insert into project_progress (user_id, project_id, current_milestone_id, status, hints_revealed_count)
    values (${userId}, ${projectId}, ${currentMilestoneId}, 'not_started', 0)
    on conflict (user_id, project_id) do nothing
  `);
  return (await db.execute<ProjectProgressRow>(sql`
    select status, current_milestone_id, hints_revealed_count
    from project_progress
    where user_id = ${userId} and project_id = ${projectId}
  `)).rows[0] ?? { status: "not_started", current_milestone_id: currentMilestoneId, hints_revealed_count: 0 };
};

const asHintArray = (hints: unknown): ProjectHint[] => {
  const parsed = z.array(z.object({ level: z.string(), text: z.string() })).safeParse(hints);
  if (!parsed.success) return [];
  return parsed.data.map((hint) => ({ level: hint.level as ProjectHint["level"], text: hint.text }));
};

const serveProject = async (db: LumiDb, userId: string, projectId: string) => {
  const { project, milestones, progress } = await loadProjectForUser(db, userId, projectId);
  const ordered = [...milestones].sort((a, b) => a.order_index - b.order_index);
  const currentIndex = progress?.status === "completed"
    ? ordered.length
    : Math.max(
      0,
      progress?.current_milestone_id
        ? ordered.findIndex((milestone) => milestone.id === progress.current_milestone_id)
        : 0,
    );
  const completedCount = progress?.current_milestone_id ? currentIndex : 0;

  const current = currentMilestoneOf(milestones, progress);
  let currentDetail: Record<string, unknown> | null = null;
  if (current && project.status === "ready") {
    const lessonIds = Array.isArray(current.relevant_lesson_ids)
      ? (current.relevant_lesson_ids as string[])
      : [];
    const lessons = lessonIds.length
      ? (await db.execute<{ id: string; title: string }>(sql`
        select id, title from lessons where id = any(${pgUuidArray(lessonIds)}::uuid[]) order by title
      `)).rows
      : [];
    const hints = asHintArray(current.hints);
    const revealedHints = Math.min(progress?.hints_revealed_count ?? 0, hints.length);
    currentDetail = {
      id: current.id,
      orderIndex: current.order_index,
      title: current.title,
      scenario: current.scenario,
      learnerDecisionPrompt: current.prompt || null,
      implementationGoal: current.implementation_goal,
      constraints: Array.isArray(current.constraints) ? current.constraints : [],
      expectedOutcome: current.expected_outcome,
      lessons,
      hints: hints.slice(0, revealedHints),
      revealedHints,
      hintCount: hints.length,
    };
  }

  return {
    project: {
      id: project.id,
      title: project.title,
      goal: project.goal,
      storyline: project.storyline,
      status: project.status,
      courseId: project.course_id,
    },
    totalMilestones: ordered.length,
    completedMilestones: Math.max(completedCount, 0),
    progressStatus: progress?.status ?? "not_started",
    currentMilestone: currentDetail,
  };
};
