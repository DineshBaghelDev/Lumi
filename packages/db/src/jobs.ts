import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

export type GenerationJobType = "research" | "curriculum" | "lesson" | "project" | "question";
export type GenerationJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type GenerationJobRow = {
  id: string;
  course_id: string;
  type: GenerationJobType;
  status: GenerationJobStatus;
  progress: number;
  attempts: number;
  available_at: Date;
  error: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, unknown>;
  lesson_id: string | null;
  project_id: string | null;
  assessment_id: string | null;
};

type Db = Pick<NodePgDatabase<typeof schema>, "execute">;

type EnqueueJobInput =
  | { courseId: string; type: "research" | "curriculum"; metadata?: Record<string, unknown> }
  | { courseId: string; type: "lesson"; lessonId: string; metadata?: Record<string, unknown> }
  | { courseId: string; type: "project"; projectId: string; metadata?: Record<string, unknown> }
  | { courseId: string; type: "question"; assessmentId: string; metadata?: Record<string, unknown> };

export const canTransitionGenerationJob = (
  from: GenerationJobStatus,
  to: GenerationJobStatus,
  reason: "claim" | "succeed" | "retryable_failure" | "permanent_failure" | "cancel" | "manual_retry",
) =>
  (from === "queued" && to === "running" && reason === "claim") ||
  (from === "running" && to === "succeeded" && reason === "succeed") ||
  (from === "running" && to === "queued" && reason === "retryable_failure") ||
  (from === "running" && to === "failed" && reason === "permanent_failure") ||
  ((from === "queued" || from === "running") && to === "cancelled" && reason === "cancel") ||
  (from === "failed" && to === "queued" && reason === "manual_retry");

const one = async (result: { rows: GenerationJobRow[] }) => {
  const row = result.rows[0];
  if (!row) {
    throw new Error("generation job transition rejected");
  }
  return row;
};

const jsonb = (value: Record<string, unknown> | undefined) => JSON.stringify(value ?? {});

export const enqueueGenerationJob = async (db: Db, input: EnqueueJobInput) => {
  if (input.type === "research") {
    return one(
      await db.execute<GenerationJobRow>(sql`
        with inserted as (
          insert into generation_jobs (course_id, type, metadata)
          values (${input.courseId}, 'research', ${jsonb(input.metadata)}::jsonb)
          on conflict (course_id) where type = 'research' do nothing
          returning *
        )
        select * from inserted
        union all
        select * from generation_jobs where course_id = ${input.courseId} and type = 'research'
        limit 1
      `),
    );
  }

  if (input.type === "curriculum") {
    return one(
      await db.execute<GenerationJobRow>(sql`
        with inserted as (
          insert into generation_jobs (course_id, type, metadata)
          values (${input.courseId}, 'curriculum', ${jsonb(input.metadata)}::jsonb)
          on conflict (course_id) where type = 'curriculum' do nothing
          returning *
        )
        select * from inserted
        union all
        select * from generation_jobs where course_id = ${input.courseId} and type = 'curriculum'
        limit 1
      `),
    );
  }

  if (input.type === "lesson") {
    return one(
      await db.execute<GenerationJobRow>(sql`
        with inserted as (
          insert into generation_jobs (course_id, type, lesson_id, metadata)
          values (${input.courseId}, 'lesson', ${input.lessonId}, ${jsonb(input.metadata)}::jsonb)
          on conflict (lesson_id) where type = 'lesson' do nothing
          returning *
        )
        select * from inserted
        union all
        select * from generation_jobs where type = 'lesson' and lesson_id = ${input.lessonId}
        limit 1
      `),
    );
  }

  if (input.type === "project") {
    return one(
      await db.execute<GenerationJobRow>(sql`
        with inserted as (
          insert into generation_jobs (course_id, type, project_id, metadata)
          values (${input.courseId}, 'project', ${input.projectId}, ${jsonb(input.metadata)}::jsonb)
          on conflict (project_id) where type = 'project' do nothing
          returning *
        )
        select * from inserted
        union all
        select * from generation_jobs where type = 'project' and project_id = ${input.projectId}
        limit 1
      `),
    );
  }

  if (input.type === "question") {
    return one(
      await db.execute<GenerationJobRow>(sql`
        with inserted as (
          insert into generation_jobs (course_id, type, assessment_id, metadata)
          values (${input.courseId}, 'question', ${input.assessmentId}, ${jsonb(input.metadata)}::jsonb)
          on conflict (assessment_id) where type = 'question' do nothing
          returning *
        )
        select * from inserted
        union all
        select * from generation_jobs where type = 'question' and assessment_id = ${input.assessmentId}
        limit 1
      `),
    );
  }

  throw new Error("unsupported generation job type");
};

export const claimQueuedGenerationJob = async (db: Db, id: string, lockedBy: string) =>
  one(
    await db.execute<GenerationJobRow>(sql`
      update generation_jobs
      set status = 'running',
          attempts = attempts + 1,
          locked_at = now(),
          locked_by = ${lockedBy},
          updated_at = now()
      where id = ${id} and status = 'queued' and available_at <= now()
      returning *
    `),
  );

export const succeedGenerationJob = async (db: Db, id: string) =>
  one(
    await db.execute<GenerationJobRow>(sql`
      update generation_jobs
      set status = 'succeeded',
          progress = 100,
          error = null,
          locked_at = null,
          locked_by = null,
          updated_at = now()
      where id = ${id} and status = 'running'
      returning *
    `),
  );

export const failRunningGenerationJob = async (
  db: Db,
  id: string,
  { error, retryable, maxAttempts, retryDelaySeconds }: { error: string; retryable: boolean; maxAttempts: number; retryDelaySeconds: number },
) =>
  one(
    await db.execute<GenerationJobRow>(sql`
      update generation_jobs
      set status = case when ${retryable} and attempts < ${maxAttempts} then 'queued'::generation_job_status else 'failed'::generation_job_status end,
          available_at = case when ${retryable} and attempts < ${maxAttempts} then now() + (${retryDelaySeconds} * interval '1 second') else available_at end,
          error = ${error},
          locked_at = null,
          locked_by = null,
          updated_at = now()
      where id = ${id} and status = 'running'
      returning *
    `),
  );

export const cancelQueuedOrRunningGenerationJob = async (db: Db, id: string) =>
  one(
    await db.execute<GenerationJobRow>(sql`
      update generation_jobs
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          updated_at = now()
      where id = ${id} and status in ('queued', 'running')
      returning *
    `),
  );

export const manualRetryGenerationJob = async (db: Db, id: string) =>
  one(
    await db.execute<GenerationJobRow>(sql`
      update generation_jobs
      set status = 'queued',
          attempts = 0,
          progress = 0,
          available_at = now(),
          error = null,
          locked_at = null,
          locked_by = null,
          metadata = jsonb_set(
            metadata,
            '{manual_retry_count}',
            to_jsonb(coalesce((metadata->>'manual_retry_count')::int, 0) + 1),
            true
          ),
          updated_at = now()
      where id = ${id} and status = 'failed'
      returning *
    `),
  );
