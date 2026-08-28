import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { checkDbConnection, createDbPool } from "./index.ts";
import { claimQueuedGenerationJob, enqueueGenerationJob, failRunningGenerationJob, manualRetryGenerationJob } from "./jobs.ts";
import * as schema from "./schema.ts";

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI can provide TEST_DATABASE_URL directly.
}

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "concurrent generation job enqueues collapse to one row",
  { skip: !databaseUrl && "TEST_DATABASE_URL is required for DB integration smoke" },
  async () => {
    assert.ok(databaseUrl);

    const pool = createDbPool({ databaseUrl });
    const db = drizzle(pool, { schema });
    const course = await pool.query<{ id: string }>(
      "insert into courses (title, topic) values ($1, $2) returning id",
      [`Concurrent ${randomUUID()}`, "jobs"],
    );
    const courseId = course.rows[0]?.id;
    assert.ok(courseId);

    try {
      const jobs = await Promise.all(
        Array.from({ length: 8 }, () => enqueueGenerationJob(db, { courseId, type: "research" })),
      );
      assert.deepEqual([...new Set(jobs.map((job) => job.id))].length, 1);

      const count = await pool.query<{ count: string }>(
        "select count(*) from generation_jobs where course_id = $1 and type = 'research'",
        [courseId],
      );
      assert.equal(count.rows[0]?.count, "1");
    } finally {
      await pool.query("delete from courses where id = $1", [courseId]).catch(() => undefined);
      await pool.end();
    }
  },
);

test(
  "database schema supports specs 006-012 invariants",
  { skip: !databaseUrl && "TEST_DATABASE_URL is required for DB integration smoke" },
  async () => {
    assert.ok(databaseUrl);

    const pool = createDbPool({ databaseUrl });
    const client = await pool.connect();
    const db = drizzle(client, { schema });
    let savepoint = 0;

    const expectReject = async (query: string, values: unknown[]) => {
      const name = `sp_${++savepoint}`;
      await client.query(`savepoint ${name}`);

      try {
        await client.query(query, values);
        assert.fail(`expected query to fail: ${query}`);
      } catch {
        await client.query(`rollback to savepoint ${name}`);
      } finally {
        await client.query(`release savepoint ${name}`);
      }
    };

    try {
      await checkDbConnection(db);
      await client.query("begin");

      const suffix = randomUUID();
      const user = await client.query<{ id: string }>(
        "insert into users (auth_user_id, email) values ($1, $2) returning id",
        [`auth-${suffix}`, `user-${suffix}@example.test`],
      );
      const course = await client.query<{ id: string }>(
        "insert into courses (title, topic) values ($1, $2) returning id",
        ["Drizzle foundations", "database"],
      );
      const otherCourse = await client.query<{ id: string }>(
        "insert into courses (title, topic) values ($1, $2) returning id",
        ["Other course", "database"],
      );
      const userId = user.rows[0]?.id;
      const courseId = course.rows[0]?.id;
      const otherCourseId = otherCourse.rows[0]?.id;
      assert.ok(userId);
      assert.ok(courseId);
      assert.ok(otherCourseId);

      await client.query(
        "insert into enrollments (user_id, course_id, role) values ($1, $2, 'owner')",
        [userId, courseId],
      );
      await expectReject(
        "insert into enrollments (user_id, course_id, role) values ($1, $2, 'learner')",
        [userId, courseId],
      );

      const conceptA = await client.query<{ id: string }>(
        "insert into concepts (name) values ($1) returning id",
        [`Concept A ${suffix}`],
      );
      const conceptB = await client.query<{ id: string }>(
        "insert into concepts (name) values ($1) returning id",
        [`Concept B ${suffix}`],
      );
      const conceptAId = conceptA.rows[0]?.id;
      const conceptBId = conceptB.rows[0]?.id;
      assert.ok(conceptAId);
      assert.ok(conceptBId);

      await client.query(
        "insert into course_concepts (course_id, concept_id, importance, depth_required, coverage_confidence) values ($1, $2, 3, 4, 0.75)",
        [courseId, conceptAId],
      );
      await client.query(
        "insert into concept_dependencies (concept_id, dependency_id, relationship_type) values ($1, $2, 'hard_prerequisite')",
        [conceptAId, conceptBId],
      );
      await expectReject(
        "insert into concept_dependencies (concept_id, dependency_id, relationship_type) values ($1, $2, 'hard_prerequisite')",
        [conceptAId, conceptBId],
      );

      const source = await client.query<{ id: string }>(
        "insert into sources (course_id, url, normalized_url, type) values ($1, $2, $3, 'documentation') returning id",
        [courseId, "https://example.test/docs?utm=1", "https://example.test/docs"],
      );
      await expectReject(
        "insert into sources (course_id, url, normalized_url, type) values ($1, $2, $3, 'documentation')",
        [courseId, "https://example.test/docs?utm=2", "https://example.test/docs"],
      );
      await client.query(
        "insert into sources (course_id, url, normalized_url, type) values ($1, $2, $3, 'documentation')",
        [otherCourseId, "https://example.test/docs?utm=3", "https://example.test/docs"],
      );

      const sourceId = source.rows[0]?.id;
      assert.ok(sourceId);
      await client.query(
        "insert into source_chunks (source_id, course_id, content, embedding, embedding_model, embedding_version) values ($1, $2, 'content', $3::vector, 'BAAI/bge-small-en-v1.5', 'v1')",
        [sourceId, courseId, `[${Array.from({ length: 384 }, () => "0").join(",")}]`],
      );
      const vectorIndex = await client.query<{ indexdef: string }>(
        "select indexdef from pg_indexes where indexname = 'source_chunks_embedding_hnsw_idx'",
      );
      assert.match(vectorIndex.rows[0]?.indexdef ?? "", /USING hnsw .*vector_cosine_ops/);

      const curriculum = await client.query<{ id: string }>(
        "insert into curricula (course_id) values ($1) returning id",
        [courseId],
      );
      const curriculumId = curriculum.rows[0]?.id;
      assert.ok(curriculumId);
      const moduleOne = await client.query<{ id: string }>(
        "insert into modules (curriculum_id, title, order_index) values ($1, 'One', 1) returning id",
        [curriculumId],
      );
      await client.query(
        "insert into modules (curriculum_id, title, order_index) values ($1, 'Two', 2)",
        [curriculumId],
      );
      const moduleId = moduleOne.rows[0]?.id;
      assert.ok(moduleId);
      const lesson = await client.query<{ id: string }>(
        "insert into lessons (module_id, title, order_index, schema_version) values ($1, 'Intro', 1, 1) returning id",
        [moduleId],
      );
      await expectReject(
        "insert into lessons (module_id, title, order_index, schema_version) values ($1, 'Duplicate', 1, 1)",
        [moduleId],
      );
      const orderedModules = await client.query<{ title: string }>(
        "select title from modules where curriculum_id = $1 order by order_index",
        [curriculumId],
      );
      assert.deepEqual(
        orderedModules.rows.map((row) => row.title),
        ["One", "Two"],
      );

      const lessonId = lesson.rows[0]?.id;
      assert.ok(lessonId);
      const assessment = await client.query<{ id: string }>(
        "insert into assessments (lesson_id, title) values ($1, 'Quiz') returning id",
        [lessonId],
      );
      const question = await client.query<{ id: string }>(
        "insert into questions (primary_concept_id, type, difficulty, content, answer_key) values ($1, 'objective', 1, '{\"prompt\":\"p\"}', '{\"answer\":\"a\"}') returning id",
        [conceptAId],
      );
      const assessmentId = assessment.rows[0]?.id;
      const questionId = question.rows[0]?.id;
      assert.ok(assessmentId);
      assert.ok(questionId);
      await client.query(
        "insert into question_concepts (question_id, concept_id) values ($1, $2), ($1, $3)",
        [questionId, conceptAId, conceptBId],
      );
      await client.query(
        "insert into assessment_questions (assessment_id, question_id, order_index) values ($1, $2, 1)",
        [assessmentId, questionId],
      );

      const project = await client.query<{ id: string }>(
        "insert into projects (course_id, curriculum_id, title, goal) values ($1, $2, 'Project', 'Build') returning id",
        [courseId, curriculumId],
      );
      const projectId = project.rows[0]?.id;
      assert.ok(projectId);
      await client.query(
        "insert into project_milestones (project_id, order_index, title, scenario, prompt, implementation_goal, expected_outcome, hints) values ($1, 1, 'M1', $2, $3, $4, $5, $6::jsonb)",
        [
          projectId,
          "A realistic learner scenario with enough context to guide work.",
          "Decide and implement the first slice.",
          "Create the smallest working version.",
          "A runnable milestone outcome.",
          JSON.stringify(["Check the docs", "Keep the diff small"]),
        ],
      );
      const milestone = await client.query<{ id: string }>(
        "select id from project_milestones where project_id = $1 and order_index = 1",
        [projectId],
      );
      const milestoneId = milestone.rows[0]?.id;
      assert.ok(milestoneId);

      const lessonJob = await enqueueGenerationJob(db, { courseId, type: "lesson", lessonId });
      const sameLessonJobs = [
        await enqueueGenerationJob(db, { courseId, type: "lesson", lessonId }),
        await enqueueGenerationJob(db, { courseId, type: "lesson", lessonId }),
        await enqueueGenerationJob(db, { courseId, type: "lesson", lessonId }),
      ];
      assert.deepEqual(
        [...new Set(sameLessonJobs.map((job) => job.id))],
        [lessonJob.id],
      );
      await enqueueGenerationJob(db, { courseId, type: "research" });
      await enqueueGenerationJob(db, { courseId, type: "curriculum" });
      await enqueueGenerationJob(db, { courseId, type: "project", projectId });
      await enqueueGenerationJob(db, { courseId, type: "question", assessmentId });
      await expectReject(
        "insert into generation_jobs (course_id, type) values ($1, 'research')",
        [courseId],
      );
      await expectReject(
        "insert into generation_jobs (course_id, type) values ($1, 'curriculum')",
        [courseId],
      );
      await expectReject(
        "insert into generation_jobs (course_id, type, lesson_id) values ($1, 'lesson', $2)",
        [courseId, lessonId],
      );
      await expectReject(
        "insert into generation_jobs (course_id, type, project_id) values ($1, 'project', $2)",
        [courseId, projectId],
      );
      await expectReject(
        "insert into generation_jobs (course_id, type, assessment_id) values ($1, 'question', $2)",
        [courseId, assessmentId],
      );
      for (const [type, lessonTarget, projectTarget, assessmentTarget] of [
        ["research", lessonId, null, null],
        ["curriculum", null, projectId, null],
        ["lesson", null, null, null],
        ["project", null, null, assessmentId],
        ["question", lessonId, null, assessmentId],
      ]) {
        await expectReject(
          "insert into generation_jobs (course_id, type, lesson_id, project_id, assessment_id) values ($1, $2, $3, $4, $5)",
          [courseId, type, lessonTarget, projectTarget, assessmentTarget],
        );
      }
      const claimed = await claimQueuedGenerationJob(db, lessonJob.id, "worker-a");
      assert.equal(claimed.status, "running");
      assert.equal(claimed.attempts, 1);
      const retryQueued = await failRunningGenerationJob(db, lessonJob.id, {
        error: "temporary",
        retryable: true,
        maxAttempts: 3,
        retryDelaySeconds: 60,
      });
      assert.equal(retryQueued.status, "queued");
      assert.match(retryQueued.error ?? "", /temporary/);
      assert.ok(new Date(retryQueued.available_at).getTime() > Date.now());
      await claimQueuedGenerationJob(db, lessonJob.id, "worker-a").catch((error: unknown) => {
        assert.match(error instanceof Error ? error.message : String(error), /transition rejected/);
      });
      await client.query("update generation_jobs set available_at = now() where id = $1", [lessonJob.id]);
      await claimQueuedGenerationJob(db, lessonJob.id, "worker-a");
      const failed = await failRunningGenerationJob(db, lessonJob.id, {
        error: "permanent",
        retryable: false,
        maxAttempts: 3,
        retryDelaySeconds: 60,
      });
      assert.equal(failed.status, "failed");
      const retried = await manualRetryGenerationJob(db, lessonJob.id);
      assert.equal(retried.status, "queued");
      assert.equal(retried.attempts, 0);
      assert.equal(retried.error, null);
      assert.equal(retried.metadata.manual_retry_count, 1);
      await client.query(
        "insert into lesson_progress (user_id, lesson_id, status, current_block_index) values ($1, $2, 'in_progress', 2)",
        [userId, lessonId],
      );
      await client.query(
        "insert into concept_progress (user_id, concept_id, status, last_issue) values ($1, $2, 'needs_guidance', 'missed prerequisite')",
        [userId, conceptAId],
      );
      await client.query(
        "insert into project_progress (user_id, project_id, current_milestone_id, status) values ($1, $2, $3, 'in_progress')",
        [userId, projectId, milestoneId],
      );
      await client.query(
        "insert into user_notes (user_id, course_id, lesson_id, block_id, type, content) values ($1, $2, $3, 'intro', 'note', 'Remember this')",
        [userId, courseId, lessonId],
      );
      await expectReject(
        "insert into lesson_progress (user_id, lesson_id) values ($1, $2)",
        [userId, lessonId],
      );
      await expectReject(
        "insert into concept_progress (user_id, concept_id) values ($1, $2)",
        [userId, conceptAId],
      );
      await expectReject(
        "insert into project_progress (user_id, project_id) values ($1, $2)",
        [userId, projectId],
      );
      await expectReject(
        "insert into lesson_progress (user_id, lesson_id, status) values ($1, $2, 'paused')",
        [userId, lessonId],
      );
      const llmCall = await client.query<{ id: string }>(
        "insert into llm_calls (job_id, model, prompt_version, input_tokens, output_tokens, latency_ms, cost_usd, raw_request_id) values ($1, 'test-model', 'prompt-v1', 12, 34, 56, 0.001, 'raw-1') returning id",
        [lessonJob.id],
      );
      const llmCallId = llmCall.rows[0]?.id;
      assert.ok(llmCallId);
      const chatThread = await client.query<{ id: string }>(
        "insert into chat_threads (user_id, course_id, lesson_id) values ($1, $2, $3) returning id",
        [userId, courseId, lessonId],
      );
      const chatThreadId = chatThread.rows[0]?.id;
      assert.ok(chatThreadId);
      await client.query(
        "insert into chat_messages (thread_id, role, content, citations, model, llm_call_id) values ($1, 'assistant', 'Answer', $2::jsonb, 'test-model', $3)",
        [chatThreadId, JSON.stringify([{ source_chunk_id: sourceId }]), llmCallId],
      );
      await expectReject(
        "insert into chat_messages (thread_id, role, content) values ($1, 'bot', 'bad')",
        [chatThreadId],
      );
      await expectReject(
        "insert into generation_jobs (course_id, type, status) values ($1, 'video', 'queued')",
        [courseId],
      );
      await expectReject(
        "insert into generation_jobs (course_id, type, status) values ($1, 'research', 'waiting')",
        [courseId],
      );
      const jobIndexes = await client.query<{ indexname: string }>(
        "select indexname from pg_indexes where tablename = 'generation_jobs'",
      );
      assert.ok(jobIndexes.rows.some((row) => row.indexname === "generation_jobs_claim_idx"));
      assert.ok(jobIndexes.rows.some((row) => row.indexname === "generation_jobs_course_status_idx"));
      assert.ok(jobIndexes.rows.some((row) => row.indexname === "generation_jobs_lesson_idx"));
    } finally {
      await client.query("rollback").catch(() => undefined);
      client.release();
      await pool.end();
    }
  },
);
