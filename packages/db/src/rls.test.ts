import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";

try {
  process.loadEnvFile("../../.env");
} catch {}

const databaseUrl = process.env.TEST_DATABASE_URL;

type Row = Record<string, unknown>;
type QueryResult = { rows: Row[]; rowCount?: number };
type PoolClient = {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  release(): void;
};

const connect = async (url: string): Promise<{ client: PoolClient; end: () => Promise<void> }> => {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  return { client, end: () => pool.end() };
};

const setUser = async (client: PoolClient, userId: string) => {
  await client.query("select set_config('lumi.user_id', $1, true)", [userId]);
};

test(
  "RLS denies cross-user access on user-scoped tables",
  { skip: !databaseUrl && "TEST_DATABASE_URL required" },
  async () => {
    assert.ok(databaseUrl);
    const { client, end } = await connect(databaseUrl);
    let savepoint = 0;

    const sp = async (label: string, fn: () => Promise<void>) => {
      const name = `sp_${++savepoint}`;
      await client.query(`savepoint ${name}`);
      try {
        await fn();
      } catch (error) {
        assert.fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await client.query(`release savepoint ${name}`);
      }
    };

    const expectDeny = async (label: string, fn: () => Promise<void>) => {
      const name = `sp_${++savepoint}`;
      await client.query(`savepoint ${name}`);
      try {
        await fn();
        assert.fail(`${label}: expected denial but query succeeded`);
      } catch {
        await client.query(`rollback to savepoint ${name}`);
      } finally {
        await client.query(`release savepoint ${name}`);
      }
    };

    try {
      await client.query("begin");

      // Create two users
      const suffix = randomUUID();
      const userAResult = await client.query(
        "insert into users (auth_user_id, email) values ($1, $2) returning id",
        [`rls-a-${suffix}`, `a-${suffix}@test`],
      );
      const userBResult = await client.query(
        "insert into users (auth_user_id, email) values ($1, $2) returning id",
        [`rls-b-${suffix}`, `b-${suffix}@test`],
      );
      const userIdA = userAResult.rows[0]!.id as string;
      const userIdB = userBResult.rows[0]!.id as string;

      // Create a course enrolled by user A only
      const courseResult = await client.query(
        "insert into courses (title, topic, owner_user_id) values ($1, $2, $3) returning id",
        ["RLS Test", "test", userIdA],
      );
      const courseId = courseResult.rows[0]!.id as string;
      await client.query(
        "insert into enrollments (user_id, course_id, role) values ($1, $2, 'owner')",
        [userIdA, courseId],
      );

      // Create a concept for RLS testing
      const conceptResult = await client.query(
        "insert into concepts (name) values ($1) returning id",
        [`rls-concept-${suffix}`],
      );
      const _conceptId = conceptResult.rows[0]!.id as string;

      // ─── Course-scoped tables: cross-user denial ───
      await sp("user A sees own courses", async () => {
        await setUser(client, userIdA);
        const result = await client.query("select count(*)::int as c from courses");
        assert.ok((result.rows[0]!.c as number) >= 1);
      });

      await expectDeny("user B cannot see user A courses", async () => {
        await setUser(client, userIdB);
        const result = await client.query("select count(*)::int as c from courses where id = $1", [courseId]);
        assert.equal((result.rows[0]!.c as number), 0);
      });

      await expectDeny("user B cannot see course_generation_usage", async () => {
        await setUser(client, userIdB);
        await client.query("select * from course_generation_usage where course_id = $1", [courseId]);
      });

      await expectDeny("user B cannot see generation_jobs", async () => {
        await setUser(client, userIdB);
        await client.query("select * from generation_jobs where course_id = $1", [courseId]);
      });

      await expectDeny("user B cannot see enrollments for A's course", async () => {
        await setUser(client, userIdB);
        const result = await client.query("select count(*)::int as c from enrollments where course_id = $1", [courseId]);
        assert.equal((result.rows[0]!.c as number), 0);
      });

      await expectDeny("user B cannot see curricula for A's course", async () => {
        await setUser(client, userIdB);
        await client.query("select * from curricula where course_id = $1", [courseId]);
      });

      // ─── Global read tables: both users can read ───
      await sp("user B can read concepts (global)", async () => {
        await setUser(client, userIdB);
        const result = await client.query("select count(*)::int as c from concepts");
        assert.ok((result.rows[0]!.c as number) >= 1);
      });

      // ─── Worker BYPASSRLS ───
      const workerRole = await client.query(
        "select rolbypassrls from pg_roles where rolname = 'lumi_worker'",
      );
      assert.equal(workerRole.rows[0]!.rolbypassrls as boolean, true);
    } finally {
      await client.query("rollback").catch(() => {});
      await end();
    }
  },
);

test(
  "RLS policies exist on all application tables",
  { skip: !databaseUrl && "TEST_DATABASE_URL required" },
  async () => {
    assert.ok(databaseUrl);
    const { client, end } = await connect(databaseUrl);
    try {
      const tables = [
        "users", "courses", "enrollments", "course_generation_usage",
        "course_creation_requests", "concepts", "concept_dependencies",
        "course_concepts", "sources", "source_chunks", "concept_sources",
        "curricula", "modules", "lessons", "assessments", "questions",
        "question_concepts", "assessment_questions", "assessment_attempts",
        "projects", "project_milestones", "assets", "generation_jobs",
        "lesson_progress", "concept_progress", "project_progress",
        "user_notes", "llm_calls", "chat_threads", "chat_messages",
      ];
      const result = await client.query(
        `select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = any($1)`,
        [tables],
      );
      const rlsMap = new Map(result.rows.map((r) => [r.tablename as string, r.rowsecurity as boolean]));
      for (const table of tables) {
        const enabled = rlsMap.get(table);
        if (enabled === undefined) {
          assert.fail(`Table ${table} not found in pg_tables`);
        }
        assert.equal(enabled, true, `RLS not enabled on ${table}`);
      }
    } finally {
      await end();
    }
  },
);
