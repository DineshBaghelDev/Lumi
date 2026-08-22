import assert from "node:assert/strict";
import test from "node:test";

import {
  ConfigValidationError,
  V1_CONFIG_DEFAULTS,
  V1_CONFIG_LIMITS,
  parseApiEnv,
  parseSharedServicesEnv,
  parseWebPublicEnv,
  parseWorkerEnv,
  type Env,
} from "./index.ts";

const validServerEnv: Env = {
  INSFORGE_PROJECT_URL: "https://project.example.insforge.app",
  INSFORGE_ANON_KEY: "public-anon-key",
  INSFORGE_API_KEY: "server-api-key",
  INSFORGE_DB_STRING: "postgresql://user:password@localhost:5432/lumi",
  LITELLM_API_KEY: "litellm-api-key",
};

test("API and worker load independently with V1 defaults", () => {
  const api = parseApiEnv(validServerEnv);
  const worker = parseWorkerEnv(validServerEnv);

  assert.equal(api.generationBudgets.maxLlmCalls, V1_CONFIG_DEFAULTS.generationBudgets.maxLlmCalls);
  assert.equal(worker.worker.heartbeatIntervalMs, 30_000);
  assert.equal(worker.worker.staleLockMs, 300_000);
  assert.equal(worker.worker.maxLessonJobsPerCourse, 3);
  assert.equal(worker.services.tei.embeddingDimension, 384);
});

test("shared service URLs load without server credentials", () => {
  assert.deepEqual(parseSharedServicesEnv({}), {
    liteLlm: { baseUrl: "http://127.0.0.1:4000", model: "gpt-5.5" },
    searxng: { baseUrl: "http://127.0.0.1:8080" },
    crawl4ai: { baseUrl: "http://127.0.0.1:11235" },
    tei: {
      baseUrl: "http://127.0.0.1:8081",
      modelId: "BAAI/bge-small-en-v1.5",
      embeddingDimension: 384,
    },
  });
});

test("missing and invalid required values name the offending variables", () => {
  assert.throws(
    () => parseApiEnv({ ...validServerEnv, INSFORGE_API_KEY: undefined }),
    (error: unknown) =>
      error instanceof ConfigValidationError &&
      error.message.startsWith("Invalid API environment:") &&
      error.message.includes("INSFORGE_API_KEY"),
  );

  assert.throws(
    () => parseWorkerEnv({ ...validServerEnv, INSFORGE_DB_STRING: "https://not-postgres.example" }),
    /INSFORGE_DB_STRING: must be a postgres:\/\/ or postgresql:\/\/ URL/,
  );
});

test("numeric values accept documented bounds and reject values outside them", () => {
  const atBounds = parseWorkerEnv({
    ...validServerEnv,
    WORKER_CONCURRENCY: String(V1_CONFIG_LIMITS.worker.concurrency.max),
    GENERATION_MAX_LLM_CALLS: String(V1_CONFIG_LIMITS.generationBudgets.maxLlmCalls.max),
    RESEARCH_MAX_REDIRECTS: String(V1_CONFIG_LIMITS.researchSecurity.maxRedirects.min),
  });

  assert.equal(atBounds.worker.concurrency, V1_CONFIG_LIMITS.worker.concurrency.max);
  assert.equal(
    atBounds.generationBudgets.maxLlmCalls,
    V1_CONFIG_LIMITS.generationBudgets.maxLlmCalls.max,
  );
  assert.equal(atBounds.researchSecurity.maxRedirects, 0);

  assert.throws(
    () =>
      parseWorkerEnv({
        ...validServerEnv,
        WORKER_CONCURRENCY: String(V1_CONFIG_LIMITS.worker.concurrency.max + 1),
      }),
    /WORKER_CONCURRENCY/,
  );
  assert.throws(
    () => parseApiEnv({ ...validServerEnv, GENERATION_MAX_LLM_COST_USD: "Infinity" }),
    /GENERATION_MAX_LLM_COST_USD/,
  );
  assert.throws(
    () => parseApiEnv({ ...validServerEnv, RESEARCH_MAX_REDIRECTS: "" }),
    /RESEARCH_MAX_REDIRECTS: must not be empty/,
  );
});

test("cross-field and research list guardrails fail clearly", () => {
  assert.throws(
    () =>
      parseWorkerEnv({
        ...validServerEnv,
        WORKER_HEARTBEAT_INTERVAL_MS: "30000",
        WORKER_STALE_LOCK_MS: "50000",
      }),
    /WORKER_STALE_LOCK_MS: must be at least twice WORKER_HEARTBEAT_INTERVAL_MS/,
  );
  assert.throws(
    () => parseApiEnv({ ...validServerEnv, RESEARCH_ALLOWED_OUTBOUND_PORTS: "80,70000" }),
    /RESEARCH_ALLOWED_OUTBOUND_PORTS/,
  );
  assert.throws(
    () => parseApiEnv({ ...validServerEnv, RESEARCH_ALLOWED_MIME_TYPES: "text\/html,invalid" }),
    /RESEARCH_ALLOWED_MIME_TYPES/,
  );
  assert.throws(
    () =>
      parseApiEnv({
        ...validServerEnv,
        GENERATION_MAX_CRAWLED_SOURCES: "1",
        RESEARCH_MAX_PAGES_PER_CRAWL: "2",
      }),
    /RESEARCH_MAX_PAGES_PER_CRAWL: must not exceed GENERATION_MAX_CRAWLED_SOURCES/,
  );
});

test("locked architecture values reject incompatible overrides", () => {
  assert.throws(
    () => parseWorkerEnv({ ...validServerEnv, TEI_MODEL_ID: "different/model" }),
    /TEI_MODEL_ID/,
  );
  assert.throws(
    () => parseWorkerEnv({ ...validServerEnv, TEI_EMBEDDING_DIMENSION: "768" }),
    /TEI_EMBEDDING_DIMENSION/,
  );
  assert.throws(
    () => parseWorkerEnv({ ...validServerEnv, WORKER_MAX_LESSON_JOBS_PER_COURSE: "4" }),
    /WORKER_MAX_LESSON_JOBS_PER_COURSE/,
  );
});

test("public parsing returns only the explicit public allowlist", () => {
  const publicConfig = parseWebPublicEnv({
    ...validServerEnv,
    OPENROUTER_API_KEY: "openrouter-server-secret",
    LITELLM_MASTER_KEY: "litellm-server-secret",
    NEXT_PUBLIC_INSFORGE_URL: "https://public.example.insforge.app",
    NEXT_PUBLIC_INSFORGE_ANON_KEY: "browser-anon-key",
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
  });
  const serialized = JSON.stringify(publicConfig);

  assert.equal(publicConfig.apiBaseUrl, "http://localhost:3001");
  assert.equal(publicConfig.realtime.pollingFallbackMs, 5_000);
  assert.equal(serialized.includes("server-api-key"), false);
  assert.equal(serialized.includes("openrouter-server-secret"), false);
  assert.equal(serialized.includes("litellm-server-secret"), false);
  assert.equal("apiKey" in publicConfig.insforge, false);
  assert.equal("databaseUrl" in publicConfig.insforge, false);
});
