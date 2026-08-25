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
import { lessonContentSchema } from "@lumi/shared";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { createInsforgeTokenVerifier, HttpError, registerAuth, type TokenVerifier } from "./auth.ts";

type AppDeps = {
  config?: ApiConfig;
  db?: LumiDb;
  verifyToken?: TokenVerifier;
};

const createCourseBody = z.object({
  topic: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(1000),
  targetAudience: z.string().trim().min(1).max(200).optional(),
  difficultyLevel: z.string().trim().min(1).max(80).optional(),
});

const paramsWithId = z.object({ id: z.uuid() });

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
  const app = Fastify({ logger: true });

  registerAuth(app, db, deps.verifyToken ?? createInsforgeTokenVerifier(config));

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
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

  app.addHook("onClose", async () => {
    const pool = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client;
    await pool?.end?.();
  });

  return app;
};

const pgUuidArray = (ids: readonly string[]) => `{${ids.join(",")}}`;
