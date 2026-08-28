import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseApiEnv } from "@lumi/config";
import { claimNextGenerationJob, createDbPool } from "@lumi/db";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@lumi/db";
import { createApp } from "./app.ts";

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI can provide TEST_DATABASE_URL directly.
}

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "milestone 1 gate: POST /courses creates owner enrollment and worker-claimable research job",
  { skip: !databaseUrl && "TEST_DATABASE_URL is required for DB integration gate" },
  async () => {
    assert.ok(databaseUrl);
    const config = parseApiEnv(process.env);
    const pool = createDbPool({ databaseUrl });
    const db = drizzle(pool, { schema });
    const authUserId = `gate-${randomUUID()}`;
    const app = createApp({
      config,
      db,
      verifyToken: async () => ({ authUserId, email: `${authUserId}@example.test` }),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/courses",
        headers: {
          authorization: "Bearer gate-token",
          "idempotency-key": `create-${randomUUID()}`,
        },
        payload: {
          topic: "Redis streams for beginners",
          goal: "Learn the smallest useful Redis stream workflow",
        },
      });

      assert.equal(response.statusCode, 201, response.body);
      const body = response.json() as { course: { id: string }; job: { id: string; type: string; status: string } };
      assert.equal(body.job.type, "research");
      assert.equal(body.job.status, "queued");

      const enrollment = await pool.query<{ count: string }>(
        `
          select count(*)::text
          from enrollments e
          join users u on u.id = e.user_id
          where u.auth_user_id = $1 and e.course_id = $2 and e.role = 'owner'
        `,
        [authUserId, body.course.id],
      );
      assert.equal(enrollment.rows[0]?.count, "1");

      const claimed = await claimNextGenerationJob(db, {
        lockedBy: "gate-worker",
        staleLockSeconds: 300,
        maxLessonJobsPerCourse: 3,
      });
      assert.equal(claimed?.id, body.job.id);
      assert.equal(claimed?.status, "running");
      assert.equal(claimed?.locked_by, "gate-worker");
    } finally {
      await pool.query(
        "delete from courses where id in (select e.course_id from enrollments e join users u on u.id = e.user_id where u.auth_user_id = $1)",
        [authUserId],
      ).catch(() => undefined);
      await pool.query("delete from users where auth_user_id = $1", [authUserId]).catch(() => undefined);
      await app.close();
    }
  },
);
