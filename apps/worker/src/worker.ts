import type { WorkerConfig } from "@lumi/config";
import {
  claimNextGenerationJob,
  failRunningGenerationJob,
  heartbeatGenerationJob,
  reclaimStaleGenerationJob,
  refreshCourseStatus,
  succeedGenerationJob,
  type GenerationJobRow,
  type LumiDb,
} from "@lumi/db";
import { sql } from "drizzle-orm";

export class PermanentJobError extends Error {}
export class RetryableJobError extends Error {}

export type JobHandler = (job: GenerationJobRow) => Promise<void>;
export type JobHandlers = Partial<Record<GenerationJobRow["type"], JobHandler>>;
type RunClaimedJobOptions = {
  heartbeatIntervalMs?: number;
  maxAttempts?: number;
  workerId?: string;
};
type WorkerLoopOptions = {
  claimJob: () => Promise<GenerationJobRow | null>;
  runJob: (job: GenerationJobRow) => Promise<void>;
  pollingIntervalMs: number;
  stop: Promise<void>;
  onPollingError?: (error: unknown) => void;
};

export const retryDelaySeconds = (attempts: number, error?: string) => {
  const delays = /429|rate.?limit/i.test(error ?? "") ? [60, 900, 1_800] : [5, 15, 45];
  return delays[Math.max(0, attempts - 1)] ?? delays.at(-1)!;
};

export const isRetryableError = (error: unknown) =>
  error instanceof RetryableJobError ||
  (typeof error === "object" && error !== null && "retryable" in error && error.retryable === true) ||
  (error instanceof Error && /(timeout|network|rate.?limit|5\d\d)/i.test(error.message));

export const runClaimedJob = async (
  db: LumiDb,
  job: GenerationJobRow,
  handlers: JobHandlers,
  { heartbeatIntervalMs, maxAttempts = 3, workerId }: RunClaimedJobOptions = {},
) => {
  const handler = handlers[job.type];
  if (!handler) {
    await failRunningGenerationJob(db, job.id, {
      error: `No handler registered for ${job.type}`,
      retryable: false,
      maxAttempts,
      retryDelaySeconds: 0,
    });
    await refreshCourseStatus(db, job.course_id);
    return;
  }

  let heartbeatRunning = false;
  const heartbeatTimer =
    workerId && heartbeatIntervalMs
      ? setInterval(() => {
          if (heartbeatRunning) return;
          heartbeatRunning = true;
          void heartbeatGenerationJob(db, job.id, workerId)
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error);
              console.warn(`[worker] heartbeat failed for job ${job.type} ${job.id}: ${message}`);
            })
            .finally(() => {
              heartbeatRunning = false;
            });
        }, heartbeatIntervalMs)
      : null;
  heartbeatTimer?.unref();

  try {
    await handler(job);
    await succeedGenerationJob(db, job.id);
    await refreshCourseStatus(db, job.course_id);
    console.log(`[worker] job ${job.type} ${job.id} succeeded`);
  } catch (error) {
    const retryable = !(error instanceof PermanentJobError) && isRetryableError(error);
    const message = error instanceof Error ? error.message : "Unknown job failure";
    let failed: GenerationJobRow;
    try {
      failed = await failRunningGenerationJob(db, job.id, {
        error: message,
        retryable,
        maxAttempts,
        retryDelaySeconds: retryDelaySeconds(job.attempts, message),
      });
    } catch (failureError) {
      const failureMessage = failureError instanceof Error ? failureError.message : String(failureError);
      console.error(`[worker] could not finalize failed job ${job.type} ${job.id}: ${failureMessage}`);
      return;
    }
    if (failed.status === "failed" && (job.type === "research" || job.type === "curriculum")) {
      await db.execute(sql`update courses set status = 'failed', updated_at = now() where id = ${job.course_id}`);
    }
    await refreshCourseStatus(db, job.course_id);
    if (failed.status === "queued") {
      console.warn(`[worker] job ${job.type} ${job.id} failed (attempt ${failed.attempts}, retry scheduled): ${message}`);
    } else {
      console.error(`[worker] job ${job.type} ${job.id} failed permanently after ${maxAttempts} attempts: ${message}`);
    }
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
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

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });

export const runWorkerLoop = async ({
  claimJob,
  runJob,
  pollingIntervalMs,
  stop,
  onPollingError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] polling cycle failed: ${message}`);
  },
}: WorkerLoopOptions) => {
  while (true) {
    try {
      const job = await claimJob();
      if (job) {
        await runJob(job);
        continue;
      }
    } catch (error) {
      onPollingError(error);
    }

    const stopped = await Promise.race([stop.then(() => true), sleep(pollingIntervalMs).then(() => false)]);
    if (stopped) return;
  }
};
