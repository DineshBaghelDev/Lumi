import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseWorkerEnv } from "@lumi/config";
import { claimNextGenerationJob, createCourseWithResearchJob, createDbPool, enqueueGenerationJob } from "@lumi/db";
import * as schema from "@lumi/db";
import type { ProjectContent } from "@lumi/shared";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createProjectHandler, validateProjectQuality, type ProjectContext } from "./project.ts";

const conceptId = "11111111-1111-4111-8111-111111111111";
const lessonId = "22222222-2222-4222-8222-222222222222";
const config = parseWorkerEnv({
  WORKER_DATABASE_URL: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

const context: ProjectContext = {
  concepts: [{ id: conceptId, name: "Redis streams", description: "Append-only stream entries" }],
  lessons: [{ id: lessonId, title: "Streams basics", objectives: ["Explain append-only entries"] }],
  milestones: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      order_index: 1,
      title: "Build the stream writer",
      relevant_concept_ids: [conceptId],
      relevant_lesson_ids: [lessonId],
    },
  ],
};

test("project QC accepts skeleton-aligned milestone content", () => {
  assert.equal(validateProjectQuality(validProject(), context).passed, true);
});

test("project QC rejects untaught concepts and thin milestones", () => {
  const project = validProject();
  project.milestones[0] = {
    ...project.milestones[0]!,
    scenario: "Too thin.",
    relevantConceptIds: ["44444444-4444-4444-8444-444444444444"],
  };

  const result = validateProjectQuality(project, context);

  assert.equal(result.passed, false);
  assert.match(result.reasons.join("\n"), /too thin/);
  assert.match(result.reasons.join("\n"), /untaught concepts/);
});

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI can provide TEST_DATABASE_URL directly.
}

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "milestone 5 gate: project job persists ready project content idempotently",
  { skip: !databaseUrl && "TEST_DATABASE_URL is required for DB integration gate" },
  async () => {
    assert.ok(databaseUrl);
    const pool = createDbPool({ databaseUrl });
    const db = drizzle(pool, { schema });
    const authUserId = `project-gate-${randomUUID()}`;

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
        goal: "Build a local stream workflow",
        limits: config.generationBudgets,
      });
      await db.execute(sql`update generation_jobs set status = 'succeeded' where id = ${created.job.id}`);
      const ids = await seedProjectSkeleton(db, created.course.id);
      const job = await enqueueGenerationJob(db, { courseId: created.course.id, type: "project", projectId: ids.projectId });
      const claimed = await claimNextGenerationJob(db, {
        lockedBy: "project-gate-worker",
        staleLockSeconds: 300,
        maxLessonJobsPerCourse: 3,
      });
      assert.equal(claimed?.id, job.id);

      const handler = createProjectHandler(db, config, {
        llm: { complete: async () => completeResult(JSON.stringify(validProjectFor(ids.conceptId, ids.lessonId)), "project") },
        reviewer: { complete: async () => completeResult(JSON.stringify({ passed: true, reasons: [] }), "review") },
      });

      await handler(claimed!);
      await handler({ ...claimed!, status: "running" });

      const state = await pool.query<{
        project_status: string;
        milestone_count: string;
        ready_milestones: string;
        llm_calls: string;
      }>(`
        select
          (select status from projects where id = $1) as project_status,
          (select count(*)::text from project_milestones where project_id = $1) as milestone_count,
          (select count(*)::text from project_milestones where project_id = $1 and implementation_goal <> 'pending') as ready_milestones,
          (select count(*)::text from llm_calls where job_id = $2) as llm_calls
      `, [ids.projectId, claimed!.id]);

      assert.deepEqual(state.rows[0], {
        project_status: "ready",
        milestone_count: "1",
        ready_milestones: "1",
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

const validProject = (): ProjectContent => ({
  ...validProjectFor(conceptId, lessonId),
});

const validProjectFor = (concept: string, lesson: string): ProjectContent => ({
  schemaVersion: 1,
  storyline: "A learner builds a local Redis stream tool for tracking messages.",
  teachingProgression: ["Understand the stream problem", "Choose an entry shape", "Implement a local writer"],
  milestones: [
    {
      orderIndex: 1,
      scenario: "A support team needs a local stream writer that records incoming events before a consumer reads them during retries.",
      learnerDecisionPrompt: "Which event fields should be captured first?",
      implementationGoal: "Create a local script that appends a structured event to a Redis stream.",
      constraints: ["Keep the stream key configurable"],
      expectedOutcome: "Running the script appends one event and prints the generated stream entry ID.",
      relevantConceptIds: [concept],
      relevantLessonIds: [lesson],
      hints: [
        { level: "conceptual", text: "Think of each event as an append-only record." },
        { level: "structural", text: "Keep stream name and event fields separate." },
      ],
    },
  ],
});

const completeResult = (content: string, rawRequestId: string) => ({
  content,
  model: "fixture",
  rawRequestId,
  inputTokens: 10,
  outputTokens: 20,
  latencyMs: 1,
});

const seedProjectSkeleton = async (db: ReturnType<typeof drizzle<typeof schema>>, courseId: string) => {
  const concept = (await db.execute<{ id: string }>(sql`
    insert into concepts (name, description)
    values ('Redis streams', 'Append-only stream entries')
    returning id
  `)).rows[0]!;
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
    values (${module.id}, 'Streams basics', ${JSON.stringify(["Explain append-only entries"])}::jsonb, '[]'::jsonb, 1, true, 'ready', 1, ${JSON.stringify({ conceptIds: [concept.id] })}::jsonb)
    returning id
  `)).rows[0]!;
  const project = (await db.execute<{ id: string }>(sql`
    insert into projects (course_id, curriculum_id, title, goal, status, generation_metadata)
    values (${courseId}, ${curriculum.id}, 'Build a stream writer', 'Append local events to Redis streams', 'pending', ${JSON.stringify({ conceptIds: [concept.id], lessonIds: [lesson.id] })}::jsonb)
    returning id
  `)).rows[0]!;
  await db.execute(sql`
    insert into project_milestones (project_id, order_index, title, scenario, prompt, implementation_goal, expected_outcome, relevant_lesson_ids, relevant_concept_ids)
    values (${project.id}, 1, 'Build the stream writer', 'pending', '', 'pending', 'pending', ${JSON.stringify([lesson.id])}::jsonb, ${JSON.stringify([concept.id])}::jsonb)
  `);
  return { projectId: project.id, conceptId: concept.id, lessonId: lesson.id };
};
