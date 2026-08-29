import assert from "node:assert/strict";
import test from "node:test";

import {
  ConfigValidationError,
  V1_CONFIG_DEFAULTS,
  V1_CONFIG_LIMITS,
  parseApiEnv,
  parseAuthEnv,
  parseSharedServicesEnv,
  parseWorkerEnv,
  type Env,
} from "./index.ts";

const validServerEnv: Env = {
  DATABASE_URL: "postgresql://lumi_api:password@localhost:5432/lumi",
  WORKER_DATABASE_URL: "postgresql://lumi_worker:password@localhost:5432/lumi",
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
    liteLlm: { baseUrl: "http://127.0.0.1:4000", model: "groq-gpt-5.5" },
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
    () => parseApiEnv({ ...validServerEnv, DATABASE_URL: undefined }),
    (error: unknown) =>
      error instanceof ConfigValidationError &&
      error.message.startsWith("Invalid API environment:") &&
      error.message.includes("DATABASE_URL"),
  );

  assert.throws(
    () => parseWorkerEnv({ ...validServerEnv, WORKER_DATABASE_URL: "https://not-postgres.example" }),
    /WORKER_DATABASE_URL: must be a postgres:\/\/ or postgresql:\/\/ URL/,
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

test("auth parsing locks production to verified email", () => {
  const authEnv = {
    AUTH_DATABASE_URL: "postgresql://lumi_auth:password@localhost:5432/lumi",
    BETTER_AUTH_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "a-secure-development-secret-at-least-32-characters",
    BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
  };
  const parsed = parseAuthEnv(authEnv);
  assert.equal(parsed.requireEmailVerification, false);
  assert.equal(parsed.trustedOrigins.length, 2);
  assert.throws(
    () => parseAuthEnv({ ...authEnv, NODE_ENV: "production", AUTH_REQUIRE_EMAIL_VERIFICATION: "false" }),
    /AUTH_REQUIRE_EMAIL_VERIFICATION: must be true in production/,
  );
});
