import { sql } from "drizzle-orm";
import type { LumiDb } from "@lumi/db";

/**
 * Read the per-course model override stored in course_generation_usage.limits.model.
 * Returns undefined when no override is set, letting the LLM client use its default.
 */
export const getCourseModel = async (db: LumiDb, courseId: string): Promise<string | undefined> => {
  const result = await db.execute<{ model: string | null }>(sql`
    select limits->>'model' as model
    from course_generation_usage
    where course_id = ${courseId}
  `);
  return result.rows[0]?.model ?? undefined;
};
