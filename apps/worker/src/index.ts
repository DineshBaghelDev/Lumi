import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { parseWorkerEnv } from "@lumi/config";
import { createWorkerDbClient } from "@lumi/db";
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

while (!stopping) {
  const job = await claimOneJob(db, config, workerId);
  if (job) {
    await runClaimedJob(db, job, handlers);
  } else {
    await new Promise((resolve) => setTimeout(resolve, config.worker.pollingIntervalMs));
  }
}
