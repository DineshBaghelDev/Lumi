import type { WorkerConfig } from "@lumi/config";
import {
  claimNextGenerationJob,
  failRunningGenerationJob,
  heartbeatGenerationJob,
  reclaimStaleGenerationJob,
  succeedGenerationJob,
  type GenerationJobRow,
  type LumiDb,
} from "@lumi/db";
import { sql } from "drizzle-orm";

export class PermanentJobError extends Error {}
export class RetryableJobError extends Error {}

export type JobHandler = (job: GenerationJobRow) => Promise<void>;
export type JobHandlers = Partial<Record<GenerationJobRow["type"], JobHandler>>;

export const retryDelaySeconds = (attempts: number) => [5, 15, 45][Math.max(0, attempts - 1)] ?? 45;

export const isRetryableError = (error: unknown) =>
  error instanceof RetryableJobError ||
  (typeof error === "object" && error !== null && "retryable" in error && error.retryable === true) ||
  (error instanceof Error && /(timeout|network|rate.?limit|5\d\d)/i.test(error.message));

export const runClaimedJob = async (
  db: LumiDb,
  job: GenerationJobRow,
  handlers: JobHandlers,
  maxAttempts = 3,
) => {
  const handler = handlers[job.type];
  if (!handler) {
    await failRunningGenerationJob(db, job.id, {
      error: `No handler registered for ${job.type}`,
      retryable: false,
      maxAttempts,
      retryDelaySeconds: 0,
    });
    return;
  }

  try {
    await handler(job);
    await succeedGenerationJob(db, job.id);
  } catch (error) {
    const retryable = !(error instanceof PermanentJobError) && isRetryableError(error);
    const failed = await failRunningGenerationJob(db, job.id, {
      error: error instanceof Error ? error.message : "Unknown job failure",
      retryable,
      maxAttempts,
      retryDelaySeconds: retryDelaySeconds(job.attempts),
    });
    if (failed.status === "failed" && (job.type === "research" || job.type === "curriculum")) {
      await db.execute(sql`update courses set status = 'failed', updated_at = now() where id = ${job.course_id}`);
    }
  }
};

export const claimOneJob = async (
  db: LumiDb,
  config: Pick<WorkerConfig, "worker">,
  workerId: string,
) => {
  const job = await claimNextGenerationJob(db, {
    lockedBy: workerId,
    staleLockSeconds: Math.ceil(config.worker.staleLockMs / 1000),
    maxLessonJobsPerCourse: config.worker.maxLessonJobsPerCourse,
  });
  return job ?? reclaimStaleGenerationJob(db, {
    lockedBy: workerId,
    staleLockSeconds: Math.ceil(config.worker.staleLockMs / 1000),
  });
};

export const heartbeat = (db: LumiDb, job: GenerationJobRow, workerId: string) =>
  heartbeatGenerationJob(db, job.id, workerId);
