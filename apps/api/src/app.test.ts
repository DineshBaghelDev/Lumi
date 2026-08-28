import { strict as assert } from "node:assert";
import test from "node:test";
import { parseApiEnv } from "@lumi/config";
import { createApp } from "./app.ts";

const config = parseApiEnv({
  DATABASE_URL: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

test("health returns success", async () => {
  const db = { execute: async () => ({ rows: [{ "?column?": 1 }] }) };
  const app = createApp({ config, db: db as never, resolveSession: async () => null });

  const response = await app.inject("/health");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });
  await app.close();
});

test("errors use the shared envelope", async () => {
  const db = { execute: async () => ({ rows: [] }) };
  const app = createApp({ config, db: db as never, resolveSession: async () => null });

  const response = await app.inject({ method: "POST", url: "/courses", payload: {} });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    error: { code: "unauthorized", message: "Missing auth credential" },
  });
  await app.close();
});

test("invalid bearer sessions return 401", async () => {
  const db = { execute: async () => ({ rows: [] }) };
  const app = createApp({ config, db: db as never, resolveSession: async () => null });
  const response = await app.inject({ url: "/courses", headers: { authorization: "Bearer invalid" } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.message, "Invalid auth session");
  await app.close();
});

test("cookie sessions map through ensureUser", async () => {
  const rows = [
    [{ id: "user-1", authUserId: "auth-1", email: "a@example.test" }],
    [{ id: "course-1", title: "Course" }],
  ];
  let received: Headers | undefined;
  const db = { execute: async () => ({ rows: rows.shift() ?? [] }) };
  const app = createApp({
    config,
    db: db as never,
    resolveSession: async (headers) => {
      received = headers;
      return { authUserId: "auth-1", email: "a@example.test" };
    },
  });
  const response = await app.inject({ url: "/courses", headers: { cookie: "lumi.session_token=valid" } });
  assert.equal(response.statusCode, 200);
  assert.equal(received?.get("cookie"), "lumi.session_token=valid");
  assert.deepEqual(response.json(), { courses: [{ id: "course-1", title: "Course" }] });
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
    resolveSession: async () => ({ authUserId: "auth-1", email: "a@example.test" }),
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

test("framework 4xx errors keep their status code", async () => {
  const rows = [[{ id: "user-1", authUserId: "auth-1", email: null }]];
  const db = { execute: async () => ({ rows: rows.shift() ?? [] }) };
  const app = createApp({
    config,
    db: db as never,
    resolveSession: async () => ({ authUserId: "auth-1" }),
  });

  const response = await app.inject({
    method: "POST",
    url: "/courses",
    headers: { authorization: "Bearer token", "content-type": "application/x-www-form-urlencoded" },
    payload: "nope=1",
  });

  assert.equal(response.statusCode, 415);
  assert.equal(response.json().error.code, "internal_error");
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
    resolveSession: async () => ({ authUserId: "auth-1" }),
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

test("objective scoring hides assessments from unenrolled users", async () => {
  const assessmentId = "11111111-1111-4111-8111-111111111111";
  const questionId = "22222222-2222-4222-8222-222222222222";
  const courseId = "33333333-3333-4333-8333-333333333333";
  const rows = [
    [{ id: "user-1", authUserId: "auth-1", email: null }],
    [{
      answer_key: { correctOptionId: "opt-a" },
      content: {
        id: "question-mcq-1",
        kind: "mcq",
        prompt: "Pick one",
        difficulty: 1,
        sourceRefs: [],
        primaryConceptId: "44444444-4444-4444-8444-444444444444",
        additionalConceptIds: [],
        options: [{ id: "opt-a", text: "A" }, { id: "opt-b", text: "B" }],
      },
      type: "objective",
      course_id: courseId,
    }],
    [],
  ];
  const db = { execute: async () => ({ rows: rows.shift() ?? [] }) };
  const app = createApp({
    config,
    db: db as never,
    resolveSession: async () => ({ authUserId: "auth-1" }),
  });

  const response = await app.inject({
    method: "POST",
    url: `/assessments/${assessmentId}/objective-score`,
    headers: { authorization: "Bearer token" },
    payload: { questionId, response: "opt-a" },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, "not_found");
  await app.close();
});

test("assessment submissions hide assessments from unenrolled users", async () => {
  const assessmentId = "11111111-1111-4111-8111-111111111111";
  const questionId = "22222222-2222-4222-8222-222222222222";
  const rows = [
    [{ id: "user-1", authUserId: "auth-1", email: null }],
    [{
      id: questionId,
      content: {
        id: "question-mcq-1",
        kind: "mcq",
        prompt: "Pick one",
        difficulty: 1,
        sourceRefs: [],
        primaryConceptId: "44444444-4444-4444-8444-444444444444",
        additionalConceptIds: [],
        options: [{ id: "opt-a", text: "A" }, { id: "opt-b", text: "B" }],
      },
      answer_key: { correctOptionId: "opt-a" },
      rubric: {},
      order_index: 1,
      course_id: "33333333-3333-4333-8333-333333333333",
    }],
    [],
  ];
  const db = { execute: async () => ({ rows: rows.shift() ?? [] }) };
  const app = createApp({
    config,
    db: db as never,
    resolveSession: async () => ({ authUserId: "auth-1" }),
  });

  const response = await app.inject({
    method: "POST",
    url: `/assessments/${assessmentId}/submissions`,
    headers: { authorization: "Bearer token" },
    payload: { answers: [{ questionId, response: "opt-a" }] },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, "not_found");
  await app.close();
});
