import { parseApiEnv, type ApiConfig } from "@lumi/config";
import {
  canAccessCourse,
  cancelCourseGeneration,
  checkDbConnection,
  createApiDbClient,
  createCourseWithResearchJob,
  type LumiDb,
} from "@lumi/db";
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
    const jobs = request.query && (request.query as { include?: string }).include === "jobs"
      ? (await db.execute(sql`select * from generation_jobs where course_id = ${id} order by created_at`)).rows
      : undefined;
    const usage = request.query && (request.query as { include?: string }).include === "jobs"
      ? (await db.execute(sql`select * from course_generation_usage where course_id = ${id}`)).rows[0] ?? null
      : undefined;
    return { course: course.rows[0], jobs, usage };
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
    const rows = await db.execute(sql`select * from curricula where course_id = ${id}`);
    return { curriculum: rows.rows[0] ?? null };
  });

  app.get("/courses/:id/lessons", { preHandler: app.requireAuth }, async (request) => {
    const user = request.user;
    if (!user) throw new HttpError(401, "unauthorized", "Missing user");
    const { id } = parse(paramsWithId, request.params);
    if (!(await canAccessCourse(db, user.id, id))) throw new HttpError(404, "not_found", "Course not found");
    const rows = await db.execute(sql`
      select l.*
      from lessons l
      join modules m on m.id = l.module_id
      join curricula c on c.id = m.curriculum_id
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
      select l.*, c.course_id
      from lessons l
      join modules m on m.id = l.module_id
      join curricula c on c.id = m.curriculum_id
      where l.id = ${id}
    `);
    const lesson = rows.rows[0] as ({ course_id: string } & Record<string, unknown>) | undefined;
    if (!lesson || !(await canAccessCourse(db, user.id, lesson.course_id))) {
      throw new HttpError(404, "not_found", "Lesson not found");
    }
    return { lesson };
  });

  app.addHook("onClose", async () => {
    const pool = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client;
    await pool?.end?.();
  });

  return app;
};
