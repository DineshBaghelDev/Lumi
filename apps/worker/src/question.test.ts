import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseWorkerEnv } from "@lumi/config";
import { claimNextGenerationJob, createCourseWithResearchJob, createDbPool, enqueueGenerationJob } from "@lumi/db";
import * as schema from "@lumi/db";
import type { QuestionCandidate } from "@lumi/shared";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createQuestionHandler, selectFinalQuestions, validateQuestionSet } from "./question.ts";

const conceptA = "11111111-1111-4111-8111-111111111111";
const conceptB = "22222222-2222-4222-8222-222222222222";
const config = parseWorkerEnv({
  INSFORGE_PROJECT_URL: "http://localhost:7130",
  INSFORGE_ANON_KEY: "anon",
  INSFORGE_API_KEY: "api",
  INSFORGE_DB_STRING: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

test("question QC keeps a diverse scoped candidate set", () => {
  const result = validateQuestionSet(candidates(), { requiredCount: 3, allowedConceptIds: [conceptA, conceptB] });

  assert.equal(result.passed, true);
  assert.equal(selectFinalQuestions(candidates(), 3).length, 3);
});

test("question QC rejects untaught and duplicate candidates", () => {
  const pool = candidates();
  pool.push({ ...pool[0]!, id: "question-mcq-duplicate" });
  pool[1] = { ...pool[1]!, primaryConceptId: "33333333-3333-4333-8333-333333333333" };

  const result = validateQuestionSet(pool, { requiredCount: 3, allowedConceptIds: [conceptA, conceptB] });

  assert.equal(result.passed, false);
  assert.match(result.reasons.join("\n"), /untaught primary concept/);
  assert.match(result.reasons.join("\n"), /near-duplicate/);
});

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI can provide INSFORGE_DB_STRING directly.
}

const databaseUrl = process.env.INSFORGE_DB_STRING;

test(
  "milestone 6 gate: question job populates one ready assessment idempotently",
  { skip: !databaseUrl && "INSFORGE_DB_STRING is required for DB integration gate" },
  async () => {
    assert.ok(databaseUrl);
    const pool = createDbPool({ databaseUrl });
    const db = drizzle(pool, { schema });
    const authUserId = `question-gate-${randomUUID()}`;

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
        goal: "Practice stream fundamentals",
        limits: config.generationBudgets,
      });
      await db.execute(sql`update generation_jobs set status = 'succeeded' where id = ${created.job.id}`);
      const ids = await seedAssessmentSkeleton(db, created.course.id);
      const job = await enqueueGenerationJob(db, { courseId: created.course.id, type: "question", assessmentId: ids.assessmentId });
      const claimed = await claimNextGenerationJob(db, {
        lockedBy: "question-gate-worker",
        staleLockSeconds: 300,
        maxLessonJobsPerCourse: 3,
      });
      assert.equal(claimed?.id, job.id);

      const handler = createQuestionHandler(db, config, {
        llm: { complete: async () => completeResult(JSON.stringify({ candidates: candidatesFor(ids.conceptId, ids.conceptId) }), "question") },
        reviewer: { complete: async () => completeResult(JSON.stringify({ rejections: [] }), "review") },
      });

      await handler(claimed!);
      await handler({ ...claimed!, status: "running" });

      const state = await pool.query<{
        assessment_status: string;
        questions: string;
        linked_questions: string;
        llm_calls: string;
      }>(`
        select
          (select status from assessments where id = $1) as assessment_status,
          (select count(*)::text from questions q join assessment_questions aq on aq.question_id = q.id where aq.assessment_id = $1) as questions,
          (select count(*)::text from assessment_questions where assessment_id = $1) as linked_questions,
          (select count(*)::text from llm_calls where job_id = $2) as llm_calls
      `, [ids.assessmentId, claimed!.id]);

      assert.deepEqual(state.rows[0], {
        assessment_status: "ready",
        questions: "3",
        linked_questions: "3",
        llm_calls: "2",
      });
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

const candidates = (): QuestionCandidate[] => candidatesFor(conceptA, conceptB);

const candidatesFor = (primary: string, secondary: string): QuestionCandidate[] => [
  {
    id: "question-mcq-1",
    kind: "mcq",
    prompt: "Which Redis stream operation appends a new event record?",
    difficulty: 1,
    sourceRefs: [],
    primaryConceptId: primary,
    additionalConceptIds: [],
    options: [{ id: "opt-xadd", text: "XADD" }, { id: "opt-xread", text: "XREAD" }],
    answerKey: { correctOptionId: "opt-xadd" },
  },
  {
    id: "question-fill-1",
    kind: "fill_blank",
    prompt: "A Redis stream stores entries in an ___ log.",
    difficulty: 2,
    sourceRefs: [],
    primaryConceptId: secondary,
    additionalConceptIds: [],
    answerKey: { acceptedAnswers: ["append-only"] },
  },
  {
    id: "question-short-1",
    kind: "short_answer",
    prompt: "Explain why stream entry IDs help consumers resume processing.",
    difficulty: 3,
    sourceRefs: [],
    primaryConceptId: primary,
    additionalConceptIds: [secondary],
    rubric: {
      pointsTotal: 2,
      criteria: [{ id: "crit-resume", description: "Mentions ordering and resume position", points: 2 }],
      keyPoints: ["IDs preserve position in the stream"],
    },
  },
];

const completeResult = (content: string, rawRequestId: string) => ({
  content,
  model: "fixture",
  rawRequestId,
  inputTokens: 10,
  outputTokens: 20,
  latencyMs: 1,
});

const seedAssessmentSkeleton = async (db: ReturnType<typeof drizzle<typeof schema>>, courseId: string) => {
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
  await db.execute(sql`
    insert into source_chunks (source_id, course_id, heading, content, embedding_model, embedding_version)
    values (${source.id}, ${courseId}, 'Streams', 'Redis streams are append-only logs of entries consumed by readers and consumer groups.', 'fixture', 'fixture')
  `);
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
    insert into lessons (module_id, title, objectives, required_prerequisites, order_index, is_required, status, content_json, schema_version, source_pack_metadata)
    values (
      ${module.id},
      'Streams basics',
      ${JSON.stringify(["Explain append-only stream entries"])}::jsonb,
      '[]'::jsonb,
      1,
      true,
      'ready',
      ${JSON.stringify({ schemaVersion: 1, title: "Streams basics", summary: "Streams are append-only logs.", blocks: [{ id: "block-intro", type: "paragraph", text: "Redis streams are append-only logs.", sourceRefs: [] }] })}::jsonb,
      1,
      ${JSON.stringify({ conceptIds: [concept.id] })}::jsonb
    )
    returning id
  `)).rows[0]!;
  const assessment = (await db.execute<{ id: string }>(sql`
    insert into assessments (lesson_id, title, status, generation_metadata)
    values (${lesson.id}, 'Streams check', 'pending', ${JSON.stringify({ conceptIds: [concept.id], questionCount: 3 })}::jsonb)
    returning id
  `)).rows[0]!;
  return { assessmentId: assessment.id, conceptId: concept.id };
};
