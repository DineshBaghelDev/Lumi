import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { parseWorkerEnv } from "@lumi/config";
import { createWorkerDbClient } from "@lumi/db";
import { createCurriculumHandler } from "./curriculum.ts";
import { createLessonHandler } from "./lesson.ts";
import { createProjectHandler } from "./project.ts";
import { createQuestionHandler } from "./question.ts";
import { createResearchHandler } from "./research.ts";
import { claimOneJob, runClaimedJob } from "./worker.ts";

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

process.once("SIGTERM", () => {
  stopping = true;
});
process.once("SIGINT", () => {
  stopping = true;
});

const serviceChecks = [
  ["LiteLLM", `${config.services.liteLlm.baseUrl}/health/liveliness`],
  ["SearXNG", config.services.searxng.baseUrl],
  ["Crawl4AI", `${config.services.crawl4ai.baseUrl}/health`],
  ["TEI", `${config.services.tei.baseUrl}/health`],
] as const;

while (!stopping) {
  const failed = [];
  for (const [name, url] of serviceChecks) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (!response.ok) failed.push(`${name} ${response.status}`);
    } catch {
      failed.push(name);
    }
  }
  if (failed.length === 0) break;
  console.error(`Worker waiting for local generation services: ${failed.join(", ")}. Start them with docker compose up -d.`);
  await new Promise((resolve) => setTimeout(resolve, 5_000));
}

while (!stopping) {
  try {
    const job = await claimOneJob(db, config, workerId);
    if (job) {
      await runClaimedJob(db, job, handlers, {
        heartbeatIntervalMs: config.worker.heartbeatIntervalMs,
        workerId,
      });
      continue;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] polling cycle failed: ${message}`);
  }

  if (!stopping) {
    await new Promise((resolve) => setTimeout(resolve, config.worker.pollingIntervalMs));
  }
}
