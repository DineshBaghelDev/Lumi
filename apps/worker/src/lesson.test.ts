import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseWorkerEnv } from "@lumi/config";
import { claimNextGenerationJob, createCourseWithResearchJob, createDbPool, succeedGenerationJob } from "@lumi/db";
import * as schema from "@lumi/db";
import type { LessonContent } from "@lumi/shared";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createLessonHandler, validateLessonQuality } from "./lesson.ts";

const config = parseWorkerEnv({
  INSFORGE_PROJECT_URL: "http://localhost:7130",
  INSFORGE_ANON_KEY: "anon",
  INSFORGE_API_KEY: "api",
  WORKER_DATABASE_URL: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

const sourceId = "33333333-3333-4333-8333-333333333333";
const chunkId = "44444444-4444-4444-8444-444444444444";

test("lesson QC rejects missing objective coverage and uncited factual blocks", () => {
  const content = lessonContentFixture({ sourceId, chunkId });
  content.blocks = [
    { id: "block-heading", type: "heading", level: 2, text: "Streams" },
    { id: "block-intro", type: "paragraph", text: "Redis stores events.", sourceRefs: [] },
  ];

  const result = validateLessonQuality(
    content,
    { objectives: ["Explain append-only stream entries"] },
    { prerequisites: [], assets: [] },
  );

  assert.equal(result.passed, false);
  assert.match(result.reasons.join("\n"), /missing objective coverage/);
  assert.match(result.reasons.join("\n"), /source references/);
});

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI can provide TEST_DATABASE_URL directly.
}

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "milestone 4 gate: lesson skeleton becomes ready and queues one question job idempotently",
  { skip: !databaseUrl && "TEST_DATABASE_URL is required for DB integration gate" },
  async () => {
    assert.ok(databaseUrl);
    const liveConfig = parseWorkerEnv(process.env);
    const pool = createDbPool({ databaseUrl });
    const db = drizzle(pool, { schema });
    const authUserId = `lesson-gate-${randomUUID()}`;

    try {
      const user = (await db.execute<{ id: string }>(sql`
        insert into users (auth_user_id, email)
        values (${authUserId}, ${`${authUserId}@example.test`})
        returning id
      `)).rows[0]!;
      const created = await createCourseWithResearchJob(db, {
        user: { id: user.id, authUserId, email: `${authUserId}@example.test` },
        idempotencyKey: `create-${randomUUID()}`,
        topic: "Redis streams for beginners",
        goal: "Learn Redis stream workflow",
        limits: liveConfig.generationBudgets,
      });
      const ids = await seedLessonSkeleton(db, created.course.id);
      await db.execute(sql`update generation_jobs set status = 'succeeded' where id = ${created.job.id}`);
      const lessonJob = await schema.enqueueGenerationJob(db, { courseId: created.course.id, type: "lesson", lessonId: ids.lessonId });
      await db.execute(sql`update generation_jobs set available_at = now() where id = ${lessonJob.id}`);
      const claimed = await claimNextGenerationJob(db, {
        lockedBy: "lesson-gate-worker",
        staleLockSeconds: 300,
        maxLessonJobsPerCourse: 3,
      });
      assert.equal(claimed?.id, lessonJob.id);

      let generationCalls = 0;
      const handler = createLessonHandler(db, liveConfig, {
        llm: {
          complete: async () => {
            generationCalls += 1;
            return completeResult(JSON.stringify(
              generationCalls === 1
                ? { ...lessonContentFixture(ids), blocks: [{ id: "block-intro", type: "paragraph", text: "Too thin.", sourceRefs: [] }] }
                : lessonContentFixture(ids),
            ), `lesson-${generationCalls}`);
          },
        },
        reviewer: { complete: async () => completeResult(JSON.stringify({ passed: true, reasons: [] }), "review") },
      });

      await handler(claimed!);
      await succeedGenerationJob(db, claimed!.id);
      await handler({ ...claimed!, status: "running" });

      const counts = await pool.query<{
        lesson_status: string;
        question_jobs: string;
        lesson_jobs: string;
        llm_calls: string;
      }>(`
        select
          (select status from lessons where id = $1) as lesson_status,
          (select count(*)::text from generation_jobs where course_id = $2 and type = 'question') as question_jobs,
          (select count(*)::text from generation_jobs where course_id = $2 and type = 'lesson') as lesson_jobs,
          (select count(*)::text from llm_calls where job_id = $3) as llm_calls
      `, [ids.lessonId, created.course.id, claimed!.id]);

      assert.deepEqual(counts.rows[0], {
        lesson_status: "ready",
        question_jobs: "1",
        lesson_jobs: "1",
        llm_calls: "3",
      });
      assert.equal(generationCalls, 2);
    } finally {
      await pool.query(
        "delete from courses where id in (select e.course_id from enrollments e join users u on u.id = e.user_id where u.auth_user_id = $1)",
        [authUserId],
      ).catch(() => undefined);
      await pool.query("delete from users where auth_user_id = $1", [authUserId]).catch(() => undefined);
      await pool.end();
    }
  },
);

const completeResult = (content: string, rawRequestId: string) => ({
  content,
  model: "fixture",
  rawRequestId,
  inputTokens: 10,
  outputTokens: 20,
  latencyMs: 1,
});

const seedLessonSkeleton = async (db: ReturnType<typeof drizzle<typeof schema>>, courseId: string) => {
  const concept = (await db.execute<{ id: string }>(sql`
    insert into concepts (name, description)
    values ('Redis streams', 'Append-only stream entries')
    returning id
  `)).rows[0]!;
  await db.execute(sql`
    insert into course_concepts (course_id, concept_id, importance, depth_required, coverage_status, coverage_confidence)
    values (${courseId}, ${concept.id}, 5, 4, 'covered', 0.9)
  `);
  const source = (await db.execute<{ id: string }>(sql`
    insert into sources (course_id, url, normalized_url, title, type, authority_score)
    values (${courseId}, 'https://redis.io/docs/latest/develop/data-types/streams/', ${`https://redis.io/docs/streams/${courseId}`}, 'Redis Streams', 'official', 1)
    returning id
  `)).rows[0]!;
  const chunk = (await db.execute<{ id: string }>(sql`
    insert into source_chunks (source_id, course_id, heading, content, embedding_model, embedding_version)
    values (${source.id}, ${courseId}, 'Streams', 'Redis streams are append-only logs of entries consumed by readers and consumer groups.', 'fixture', 'fixture')
    returning id
  `)).rows[0]!;
  await db.execute(sql`
    insert into concept_sources (course_id, concept_id, source_id, relevance_score, role)
    values (${courseId}, ${concept.id}, ${source.id}, 0.95, 'source_pack')
  `);
  const curriculum = (await db.execute<{ id: string }>(sql`
    insert into curricula (course_id)
    values (${courseId})
    returning id
  `)).rows[0]!;
  const module = (await db.execute<{ id: string }>(sql`
    insert into modules (curriculum_id, title, order_index)
    values (${curriculum.id}, 'Redis stream foundations', 1)
    returning id
  `)).rows[0]!;
  const lesson = (await db.execute<{ id: string }>(sql`
    insert into lessons (module_id, title, objectives, required_prerequisites, order_index, is_required, status, schema_version, source_pack_metadata)
    values (
      ${module.id},
      'Streams basics',
      ${JSON.stringify(["Explain append-only stream entries"])}::jsonb,
      '[]'::jsonb,
      1,
      true,
      'pending',
      1,
      ${JSON.stringify({ conceptIds: [concept.id], sourcePackIds: ["streams-pack"] })}::jsonb
    )
    returning id
  `)).rows[0]!;
  const assessment = (await db.execute<{ id: string }>(sql`
    insert into assessments (lesson_id, title, status)
    values (${lesson.id}, 'Streams check', 'pending')
    returning id
  `)).rows[0]!;
  return { sourceId: source.id, chunkId: chunk.id, lessonId: lesson.id, assessmentId: assessment.id };
};

const lessonContentFixture = ({ sourceId, chunkId }: { sourceId: string; chunkId: string }): LessonContent => ({
  schemaVersion: 1,
  title: "Streams basics",
  summary: "Redis stream entries are append-only records read by consumers.",
  blocks: [
    { id: "block-heading", type: "heading", level: 2, text: "Append-only stream entries" },
    {
      id: "block-intro",
      type: "paragraph",
      text: "This lesson explains append-only Redis stream entries and how consumers read them by ID.",
      sourceRefs: [{ sourceId, chunkId }],
    },
    {
      id: "block-flow",
      type: "mermaid",
      diagram: "flowchart LR\nProducer --> Stream --> Consumer",
      caption: "A producer appends entries before consumers read them.",
      sourceRefs: [{ sourceId, chunkId }],
    },
  ],
});
