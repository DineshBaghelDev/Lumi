import { strict as assert } from "node:assert";
import test from "node:test";
import { parseApiEnv } from "@lumi/config";
import { createApp } from "./app.ts";

const config = parseApiEnv({
  INSFORGE_PROJECT_URL: "http://localhost:7130",
  INSFORGE_ANON_KEY: "anon",
  INSFORGE_API_KEY: "api",
  INSFORGE_DB_STRING: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

test("health returns success", async () => {
  const db = { execute: async () => ({ rows: [{ "?column?": 1 }] }) };
  const app = createApp({ config, db: db as never, verifyToken: async () => null });

  const response = await app.inject("/health");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });
  await app.close();
});

test("errors use the shared envelope", async () => {
  const db = { execute: async () => ({ rows: [] }) };
  const app = createApp({ config, db: db as never, verifyToken: async () => null });

  const response = await app.inject({ method: "POST", url: "/courses", payload: {} });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    error: { code: "unauthorized", message: "Missing bearer token" },
  });
  await app.close();
});

test("manual retry reuses a failed generation job", async () => {
  const jobId = "11111111-1111-4111-8111-111111111111";
  const courseId = "22222222-2222-4222-8222-222222222222";
  const calls: unknown[] = [];
  const rows = [
    [{ id: "user-1", authUserId: "auth-1", email: "a@example.test" }],
    [{ id: jobId, course_id: courseId, type: "research", status: "failed", progress: 25, attempts: 3, error: "fetch failed" }],
    [{ ok: true }],
    [{ id: jobId, course_id: courseId, type: "research", status: "queued", progress: 0, attempts: 0, error: null }],
    [],
  ];
  const db = { execute: async (query: unknown) => ({ rows: (calls.push(query), rows.shift() ?? []) }) };
  const app = createApp({
    config,
    db: db as never,
    verifyToken: async () => ({ authUserId: "auth-1", email: "a@example.test" }),
  });

  const response = await app.inject({
    method: "POST",
    url: `/generation-jobs/${jobId}/retry`,
    headers: { authorization: "Bearer token" },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    job: {
      id: jobId,
      type: "research",
      status: "queued",
      progress: 0,
      attempts: 0,
      stage: "Researching sources",
      canRetry: false,
      message: null,
    },
  });
  assert.equal(calls.length, 5);
  await app.close();
});

test("manual retry rejects active jobs", async () => {
  const jobId = "11111111-1111-4111-8111-111111111111";
  const courseId = "22222222-2222-4222-8222-222222222222";
  const rows = [
    [{ id: "user-1", authUserId: "auth-1", email: null }],
    [{ id: jobId, course_id: courseId, type: "research", status: "running", progress: 25, attempts: 1, error: null }],
    [{ ok: true }],
  ];
  const db = { execute: async () => ({ rows: rows.shift() ?? [] }) };
  const app = createApp({
    config,
    db: db as never,
    verifyToken: async () => ({ authUserId: "auth-1" }),
  });

  const response = await app.inject({
    method: "POST",
    url: `/generation-jobs/${jobId}/retry`,
    headers: { authorization: "Bearer token" },
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error.code, "invalid_job_state");
  await app.close();
});
