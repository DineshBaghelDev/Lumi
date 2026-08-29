import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { parseWorkerEnv } from "@lumi/config";
import { createWorkerDbClient } from "@lumi/db";
import { createCurriculumHandler } from "./curriculum.ts";
import { createLessonHandler } from "./lesson.ts";
import { createProjectHandler } from "./project.ts";
import { createQuestionHandler } from "./question.ts";
import { createResearchHandler } from "./research.ts";
import { claimOneJob, runClaimedJob, runWorkerLoop } from "./worker.ts";

try {
  loadEnvFile("../../.env");
} catch {
  // Production can provide env directly.
}

const config = parseWorkerEnv(process.env);
const db = createWorkerDbClient(config);
const handlers = {
  curriculum: createCurriculumHandler(db, config),
  lesson: createLessonHandler(db, config),
  project: createProjectHandler(db, config),
  question: createQuestionHandler(db, config),
  research: createResearchHandler(db, config),
};
const workerId = `worker-${randomUUID()}`;
let stopping = false;
let resolveStop: (() => void) | null = null;
const stop = new Promise<void>((resolve) => {
  resolveStop = resolve;
});

process.once("SIGTERM", () => {
  stopping = true;
  resolveStop?.();
});
process.once("SIGINT", () => {
  stopping = true;
  resolveStop?.();
});

const serviceChecks = [
  ["LiteLLM", `${config.services.liteLlm.baseUrl}/health/liveliness`],
  ["SearXNG", config.services.searxng.baseUrl],
  ["Crawl4AI", `${config.services.crawl4ai.baseUrl}/health`],
  ["TEI", `${config.services.tei.baseUrl}/health`],
] as const;

const MAX_SERVICE_WAIT_MS = 10 * 60_000; // 10 minutes before logging a persistent warning
const SERVICE_CHECK_INTERVAL_MS = 5_000;
const SERVICE_RETRY_INTERVAL_MS = 30_000; // after initial wait, retry every 30s
const serviceWaitStart = Date.now();
let loggedGiveUp = false;

while (!stopping) {
  const failed: string[] = [];
  for (const [name, url] of serviceChecks) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (!response.ok) failed.push(`${name} ${response.status}`);
    } catch {
      failed.push(name);
    }
  }
  if (failed.length === 0) break;

  const elapsed = Date.now() - serviceWaitStart;
  if (elapsed >= MAX_SERVICE_WAIT_MS) {
    if (!loggedGiveUp) {
      console.error(`[worker] WARNING: Some services still unavailable after ${MAX_SERVICE_WAIT_MS / 60_000} minutes: ${failed.join(", ")}. Worker will keep retrying.`);
      loggedGiveUp = true;
    }
    await new Promise((resolve) => setTimeout(resolve, SERVICE_RETRY_INTERVAL_MS));
    continue;
  }

  console.error(`[worker] Waiting for local generation services: ${failed.join(", ")}. Start them with docker compose up -d. (elapsed: ${Math.round(elapsed / 1000)}s)`);
  await new Promise((resolve) => setTimeout(resolve, SERVICE_CHECK_INTERVAL_MS));
}

if (!stopping) {
  await Promise.all(
    Array.from({ length: config.worker.concurrency }, (_, index) => {
      const slotWorkerId = `${workerId}-${index + 1}`;
      return runWorkerLoop({
        claimJob: () => claimOneJob(db, config, slotWorkerId),
        runJob: (job) =>
          runClaimedJob(db, job, handlers, {
            heartbeatIntervalMs: config.worker.heartbeatIntervalMs,
            workerId: slotWorkerId,
          }),
        pollingIntervalMs: config.worker.pollingIntervalMs,
        stop,
      });
    }),
  );
}
