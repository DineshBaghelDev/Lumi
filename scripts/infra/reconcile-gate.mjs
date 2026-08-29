#!/usr/bin/env node
/**
 * T19 — Post-restore reconciliation gate.
 *
 * Compares row counts, null-owner courses, vector dimensions,
 * and HNSW index existence against the live database.
 *
 * Usage:
 *   TEST_DATABASE_URL=postgresql://lumi_migrator:...@127.0.0.1:6432/lumi \
 *     node scripts/infra/reconcile-gate.mjs
 *
 * Optional:
 *   MANIFEST_PATH=path/to/manifest.json   — compare against export manifest
 */

import { exit } from "node:process";
import { createRequire } from "node:module";

try { process.loadEnvFile("../../.env"); } catch {}

const url = process.env.TEST_DATABASE_URL;
if (!url) { console.error("TEST_DATABASE_URL required"); exit(1); }

const requireDb = createRequire(new URL("../../packages/db/package.json", import.meta.url));
const { Pool } = requireDb("pg");

const pool = new Pool({ connectionString: url, max: 1 });
const client = await pool.connect();
let failures = 0;

const gate = (name, pass, detail) => {
  const icon = pass ? "✅" : "❌";
  console.log(`${icon}  ${name}: ${detail}`);
  if (!pass) failures += 1;
};

const TABLES = [
  "users", "courses", "enrollments", "course_generation_usage",
  "course_creation_requests", "concepts", "concept_dependencies",
  "course_concepts", "sources", "source_chunks", "concept_sources",
  "curricula", "modules", "lessons", "assessments", "questions",
  "question_concepts", "assessment_questions", "assessment_attempts",
  "projects", "project_milestones", "assets", "generation_jobs",
  "lesson_progress", "concept_progress", "project_progress",
  "user_notes", "llm_calls", "chat_threads", "chat_messages",
];

try {
  // 1. Row counts
  const counts = await client.query(
    `select tablename, count(*)::int as count from pg_tables t
     join pg_stat_user_tables s on s.relname = t.tablename
     where t.schemaname = 'public' and t.tablename = any($1)
     group by t.tablename`,
    [TABLES],
  );
  const countMap = new Map(counts.rows.map((r) => [r.tablename, r.count]));
  for (const table of TABLES) {
    const count = countMap.get(table) ?? 0;
    gate(`Table ${table}`, true, `rows=${count}`);
  }

  // 2. No null owner courses
  const owners = await client.query(
    "select count(*)::int as c from courses where owner_user_id is null",
  );
  gate("No null-owner courses", owners.rows[0].c === 0, `null_owners=${owners.rows[0].c}`);

  // 3. Vector dimensions
  const dims = await client.query(
    "select array_agg(distinct vector_dims(embedding)) filter (where embedding is not null) as d from source_chunks",
  );
  const dimensions = dims.rows[0]?.d ?? [];
  gate("Vector dimensions = 384", dimensions.every((d) => d === 384), JSON.stringify(dimensions));

  // 4. HNSW index
  const idx = await client.query(
    "select indexdef from pg_indexes where indexname = 'source_chunks_embedding_hnsw_idx'",
  );
  gate("HNSW index present", idx.rows.length === 1, idx.rows[0]?.indexdef ? "present" : "missing");

  // 5. Auth tables exist
  const authTables = await client.query(
    "select count(*)::int as c from information_schema.tables where table_schema='public' and table_name like 'auth_%'",
  );
  gate("Auth tables present", authTables.rows[0].c >= 3, `count=${authTables.rows[0].c}`);

  // 6. If manifest provided, compare hashes
  const manifestPath = process.env.MANIFEST_PATH;
  if (manifestPath) {
    const { readFileSync } = await import("node:fs");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const [table, expected] of Object.entries(manifest.tables ?? {})) {
      const actual = countMap.get(table);
      const expectedCount = expected.count;
      gate(`Manifest ${table} count`, actual === expectedCount, `expected=${expectedCount} actual=${actual}`);
    }
  }
} finally {
  client.release();
  await pool.end();
}

console.log(`\n${failures === 0 ? "✅ Reconciliation passes" : `❌ ${failures} check(s) failed`}`);
exit(failures === 0 ? 0 : 1);
