import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ApiConfig } from "@lumi/config";
import * as schema from "./schema.ts";
import { enqueueGenerationJob, type GenerationJobRow } from "./jobs.ts";

type Db = Pick<NodePgDatabase<typeof schema>, "execute" | "transaction">;

export type CourseStatus = "generating" | "ready" | "ready_with_gaps" | "failed" | "cancelled" | "archived";

export type AuthenticatedUser = {
  id: string;
  authUserId: string;
  email: string | null;
};

export type CreateCourseInput = {
  user: AuthenticatedUser;
  idempotencyKey: string;
  topic: string;
  goal: string;
  targetAudience?: string | null;
  difficultyLevel?: string | null;
  limits: ApiConfig["generationBudgets"];
};

export type CreatedCourse = {
  course: {
    id: string;
    title: string;
    topic: string;
    description: string | null;
    status: CourseStatus;
  };
  job: GenerationJobRow;
};

export const deriveCourseStatus = ({
  hasCurriculum,
  jobs,
  currentStatus,
}: {
  hasCurriculum: boolean;
  jobs: readonly { type: string; status: string }[];
  currentStatus: CourseStatus;
}): CourseStatus => {
  if (currentStatus === "archived" || currentStatus === "cancelled") return currentStatus;
  if (jobs.some((job) => job.status === "queued" || job.status === "running")) return "generating";
  if (jobs.some((job) => (job.type === "research" || job.type === "curriculum") && job.status !== "succeeded")) {
    return "failed";
  }
  if (!hasCurriculum) return jobs.length === 0 ? "generating" : "failed";
  if (jobs.some((job) => ["failed", "cancelled"].includes(job.status))) return "ready_with_gaps";
  return "ready";
};

export const refreshCourseStatus = async (
  db: Pick<NodePgDatabase<typeof schema>, "execute">,
  courseId: string,
) => {
  const state = await db.execute<{ status: CourseStatus; has_curriculum: boolean }>(sql`
    select c.status, exists (
      select 1 from curricula curriculum where curriculum.course_id = c.id
    ) as has_curriculum
    from courses c where c.id = ${courseId}
  `);
  const row = state.rows[0];
  if (!row) return null;
  const jobs = await db.execute<{ type: string; status: string }>(sql`
    select type, status from generation_jobs where course_id = ${courseId}
  `);
  const status = deriveCourseStatus({
    hasCurriculum: row.has_curriculum,
    jobs: jobs.rows,
    currentStatus: row.status,
  });
  await db.execute(sql`update courses set status = ${status}, updated_at = now() where id = ${courseId}`);
  return status;
};

export const ensureUser = async (
  db: Pick<NodePgDatabase<typeof schema>, "execute">,
  authUser: { authUserId: string; email?: string | null },
) => {
  const result = await db.execute<AuthenticatedUser>(sql`
    insert into users (auth_user_id, email)
    values (${authUser.authUserId}, ${authUser.email ?? null})
    on conflict (auth_user_id) do update
      set email = coalesce(excluded.email, users.email),
          updated_at = now()
    returning id, auth_user_id as "authUserId", email
  `);
  const row = result.rows[0];
  if (!row) throw new Error("user upsert failed");
  return { id: row.id, authUserId: row.authUserId, email: row.email };
};

export const createCourseWithResearchJob = async (db: Db, input: CreateCourseInput): Promise<CreatedCourse> =>
  db.transaction(async (tx) => {
    const existing = await tx.execute<{ course_id: string }>(sql`
      select course_id
      from course_creation_requests
      where user_id = ${input.user.id} and idempotency_key = ${input.idempotencyKey}
    `);
    const existingCourseId = existing.rows[0]?.course_id;
    if (existingCourseId) return getCreatedCourse(tx, existingCourseId);

    const title = input.topic.trim();
    const courseResult = await tx.execute<CreatedCourse["course"]>(sql`
      insert into courses (owner_user_id, title, description, topic, target_audience, difficulty_level, status)
      values (${input.user.id}, ${title}, ${input.goal}, ${input.topic}, ${input.targetAudience ?? null}, ${input.difficultyLevel ?? null}, 'generating')
      returning id, title, topic, description, status
    `);
    const course = courseResult.rows[0];
    if (!course) throw new Error("course insert failed");

    await tx.execute(sql`
      insert into enrollments (user_id, course_id, role, status)
      values (${input.user.id}, ${course.id}, 'owner', 'active')
    `);
    await tx.execute(sql`
      insert into course_generation_usage (course_id, limits)
      values (${course.id}, ${JSON.stringify(input.limits)}::jsonb)
    `);
    await tx.execute(sql`
      insert into course_creation_requests (user_id, idempotency_key, course_id)
      values (${input.user.id}, ${input.idempotencyKey}, ${course.id})
    `);

    const job = await enqueueGenerationJob(tx, { courseId: course.id, type: "research" });
    return { course, job };
  });

const getCreatedCourse = async (db: Pick<NodePgDatabase<typeof schema>, "execute">, courseId: string) => {
  const courseResult = await db.execute<CreatedCourse["course"]>(sql`
    select id, title, topic, description, status
    from courses
    where id = ${courseId}
  `);
  const course = courseResult.rows[0];
  if (!course) throw new Error("idempotent course lookup failed");
  const job = await db.execute<GenerationJobRow>(sql`
    select *
    from generation_jobs
    where course_id = ${courseId} and type = 'research'
    limit 1
  `);
  const researchJob = job.rows[0];
  if (!researchJob) throw new Error("idempotent job lookup failed");
  return { course, job: researchJob };
};

export const canAccessCourse = async (
  db: Pick<NodePgDatabase<typeof schema>, "execute">,
  userId: string,
  courseId: string,
) => {
  const result = await db.execute<{ ok: boolean }>(sql`
    select true as ok
    from enrollments
    where user_id = ${userId} and course_id = ${courseId} and status = 'active'
    limit 1
  `);
  return result.rows.length > 0;
};

export const cancelCourseGeneration = async (
  db: Db,
  { userId, courseId }: { userId: string; courseId: string },
) =>
  db.transaction(async (tx) => {
    if (!(await canAccessCourse(tx, userId, courseId))) return null;
    await tx.execute(sql`
      update course_generation_usage
      set cancel_requested_at = coalesce(cancel_requested_at, now()),
          updated_at = now()
      where course_id = ${courseId}
    `);
    await tx.execute(sql`
      update generation_jobs
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          updated_at = now()
      where course_id = ${courseId} and status = 'queued'
    `);
    await tx.execute(sql`
      update courses
      set status = 'cancelled', updated_at = now()
      where id = ${courseId}
    `);
    return { courseId, status: "cancelled" as const };
  });
