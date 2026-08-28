import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseWorkerEnv } from "@lumi/config";
import { claimNextGenerationJob, createCourseWithResearchJob, createDbPool, succeedGenerationJob } from "@lumi/db";
import * as schema from "@lumi/db";
import type { CurriculumStructuredOutput } from "@lumi/shared";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createCurriculumHandler, validateCurriculum } from "./curriculum.ts";

const config = parseWorkerEnv({
  INSFORGE_PROJECT_URL: "http://localhost:7130",
  INSFORGE_ANON_KEY: "anon",
  INSFORGE_API_KEY: "api",
  WORKER_DATABASE_URL: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

test("curriculum validator rejects hard prerequisite ordering violations", () => {
  const prerequisite = "11111111-1111-4111-8111-111111111111";
  const dependent = "22222222-2222-4222-8222-222222222222";
  const curriculum = curriculumFixture({ prerequisite, dependent });
  curriculum.modules[0]!.lessons[0]!.conceptIds = [dependent];
  curriculum.modules[0]!.lessons[1]!.conceptIds = [prerequisite];
  assert.throws(
    () => validateCurriculum(curriculum, [
      conceptFixture(prerequisite, []),
      conceptFixture(dependent, [prerequisite]),
    ]),
    /Hard prerequisite ordering violated/,
  );
});

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI can provide TEST_DATABASE_URL directly.
}

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "milestone 3 gate: curriculum persists skeletons and queues lesson/project jobs idempotently",
  { skip: !databaseUrl && "TEST_DATABASE_URL is required for DB integration gate" },
  async () => {
    assert.ok(databaseUrl);
    const liveConfig = parseWorkerEnv(process.env);
    const pool = createDbPool({ databaseUrl });
    const db = drizzle(pool, { schema });
    const authUserId = `curriculum-gate-${randomUUID()}`;

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
      const prerequisite = await insertConcept(db, created.course.id, "Redis streams", []);
      const dependent = await insertConcept(db, created.course.id, "Consumer groups", [prerequisite]);
      const sourceId = await insertSource(db, created.course.id);

      await db.execute(sql`
        update course_concepts
        set source_pack_metadata = ${JSON.stringify({ sourceIds: [sourceId] })}::jsonb
        where course_id = ${created.course.id}
      `);
      await db.execute(sql`
        update generation_jobs
        set status = 'succeeded'
        where id = ${created.job.id}
      `);
      const curriculumJob = await schema.enqueueGenerationJob(db, { courseId: created.course.id, type: "curriculum" });
      await db.execute(sql`update generation_jobs set available_at = now() where id = ${curriculumJob.id}`);
      const claimed = await claimNextGenerationJob(db, {
        lockedBy: "curriculum-gate-worker",
        staleLockSeconds: 300,
        maxLessonJobsPerCourse: 3,
      });
      assert.equal(claimed?.id, curriculumJob.id);

      const curriculum = curriculumFixture({ prerequisite, dependent, sourceId });
      const handler = createCurriculumHandler(db, liveConfig, {
        llm: {
          complete: async () => ({
            content: JSON.stringify(curriculum),
            model: "fixture",
            rawRequestId: "fixture-request",
            inputTokens: 10,
            outputTokens: 20,
            latencyMs: 1,
          }),
        },
      });

      await handler(claimed!);
      await succeedGenerationJob(db, claimed!.id);
      await handler({ ...claimed!, status: "running" });

      const counts = await pool.query<{
        curricula: string;
        modules: string;
        lessons: string;
        assessments: string;
        projects: string;
        milestones: string;
        lesson_jobs: string;
        project_jobs: string;
      }>(`
        select
          (select count(*)::text from curricula where course_id = $1) as curricula,
          (select count(*)::text from modules m join curricula c on c.id = m.curriculum_id where c.course_id = $1) as modules,
          (select count(*)::text from lessons l join modules m on m.id = l.module_id join curricula c on c.id = m.curriculum_id where c.course_id = $1) as lessons,
          (select count(*)::text from assessments a join lessons l on l.id = a.lesson_id join modules m on m.id = l.module_id join curricula c on c.id = m.curriculum_id where c.course_id = $1) as assessments,
          (select count(*)::text from projects where course_id = $1) as projects,
          (select count(*)::text from project_milestones pm join projects p on p.id = pm.project_id where p.course_id = $1) as milestones,
          (select count(*)::text from generation_jobs where course_id = $1 and type = 'lesson') as lesson_jobs,
          (select count(*)::text from generation_jobs where course_id = $1 and type = 'project') as project_jobs
      `, [created.course.id]);

      assert.deepEqual(counts.rows[0], {
        curricula: "1",
        modules: "1",
        lessons: "2",
        assessments: "2",
        projects: "1",
        milestones: "1",
        lesson_jobs: "2",
        project_jobs: "1",
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

const conceptFixture = (id: string, hardPrerequisites: string[]) => ({
  id,
  name: id,
  description: null,
  importance: 5,
  depth_required: 4,
  coverage_status: "covered" as const,
  source_ids: ["33333333-3333-4333-8333-333333333333"],
  hard_prerequisites: hardPrerequisites,
});

const curriculumFixture = ({
  prerequisite = "11111111-1111-4111-8111-111111111111",
  dependent = "22222222-2222-4222-8222-222222222222",
  sourceId = "33333333-3333-4333-8333-333333333333",
}: {
  prerequisite?: string;
  dependent?: string;
  sourceId?: string;
}): CurriculumStructuredOutput => ({
  schemaVersion: 1,
  conceptIds: [prerequisite, dependent],
  sourcePacks: [
    { id: "streams-pack", conceptId: prerequisite, sourceIds: [sourceId], coverageStatus: "covered" },
    { id: "groups-pack", conceptId: dependent, sourceIds: [sourceId], coverageStatus: "covered" },
  ],
  modules: [
    {
      id: "module-1",
      title: "Redis stream foundations",
      orderIndex: 1,
      lessons: [
        {
          id: "lesson-1",
          title: "Streams basics",
          objectives: ["Explain append-only stream entries"],
          orderIndex: 1,
          isRequired: true,
          conceptIds: [prerequisite],
          sourcePackIds: ["streams-pack"],
          requiredPrerequisiteConceptIds: [],
          assessment: { title: "Streams check", conceptIds: [prerequisite], questionCount: 3 },
        },
        {
          id: "lesson-2",
          title: "Consumer groups",
          objectives: ["Use consumer groups for coordinated stream processing"],
          orderIndex: 2,
          isRequired: true,
          conceptIds: [dependent],
          sourcePackIds: ["groups-pack"],
          requiredPrerequisiteConceptIds: [prerequisite],
          assessment: { title: "Consumer group check", conceptIds: [dependent], questionCount: 3 },
        },
      ],
    },
  ],
  projects: [
    {
      id: "project-1",
      title: "Build a stream worker",
      goal: "Process stream entries with acknowledgements",
      conceptIds: [prerequisite, dependent],
      lessonIds: ["lesson-1", "lesson-2"],
      milestones: [
        {
          id: "milestone-1",
          title: "Read and acknowledge entries",
          orderIndex: 1,
          conceptIds: [dependent],
          lessonIds: ["lesson-2"],
        },
      ],
    },
  ],
  generationSummary: { title: "Redis streams", coverageStatus: "ready", notes: ["fixture"] },
});

const insertConcept = async (db: ReturnType<typeof drizzle<typeof schema>>, courseId: string, name: string, prerequisites: string[]) => {
  const concept = (await db.execute<{ id: string }>(sql`
    insert into concepts (name, description)
    values (${name}, ${`${name} description`})
    returning id
  `)).rows[0]!;
  await db.execute(sql`
    insert into course_concepts (course_id, concept_id, importance, depth_required, coverage_status, coverage_confidence)
    values (${courseId}, ${concept.id}, 5, 4, 'covered', 0.9)
  `);
  for (const prerequisite of prerequisites) {
    await db.execute(sql`
      insert into concept_dependencies (concept_id, dependency_id, relationship_type)
      values (${concept.id}, ${prerequisite}, 'hard_prerequisite')
    `);
  }
  return concept.id;
};

const insertSource = async (db: ReturnType<typeof drizzle<typeof schema>>, courseId: string) => {
  const source = (await db.execute<{ id: string }>(sql`
    insert into sources (course_id, url, normalized_url, title, type)
    values (${courseId}, 'https://redis.io/docs/streams', ${`https://redis.io/docs/streams/${courseId}`}, 'Redis Streams', 'official')
    returning id
  `)).rows[0]!;
  await db.execute(sql`
    insert into concept_sources (course_id, concept_id, source_id, relevance_score, role)
    select ${courseId}, concept_id, ${source.id}, 0.9, 'source_pack'
    from course_concepts
    where course_id = ${courseId}
  `);
  return source.id;
};
