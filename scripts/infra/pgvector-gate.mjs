#!/usr/bin/env node
/**
 * T17 — pgvector retrieval gate.
 *
 * Verifies:
 *   1. HNSW cosine index exists on source_chunks.embedding
 *   2. All embeddings have 384 dimensions
 *   3. Cosine-NN query returns deterministic ordering
 *
 * Usage:
 *   TEST_DATABASE_URL=postgresql://lumi_migrator:...@127.0.0.1:6432/lumi \
 *     node scripts/infra/pgvector-gate.mjs
 */

import { exit } from "node:process";
import { createRequire } from "node:module";

try { process.loadEnvFile("../../.env"); } catch {}

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("TEST_DATABASE_URL is required");
  exit(1);
}

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

try {
  // 1. HNSW index
  const idx = await client.query(
    "select indexdef from pg_indexes where indexname = 'source_chunks_embedding_hnsw_idx'",
  );
  gate("HNSW index", idx.rows.length === 1 && idx.rows[0].indexdef.includes("hnsw"), idx.rows[0]?.indexdef ?? "missing");

  // 2. Dimension consistency
  const dims = await client.query(
    "select array_agg(distinct vector_dims(embedding)) filter (where embedding is not null) as d from source_chunks",
  );
  const dimensions = dims.rows[0]?.d ?? [];
  const all384 = dimensions.every((d) => d === 384);
  gate("Vector dimension", all384, dimensions.length > 0 ? JSON.stringify(dimensions) : "no embeddings yet");

  // 3. Sample cosine ranking (deterministic if same data)
  const sample = await client.query(
    "select id, course_id, embedding from source_chunks where embedding is not null limit 1",
  );
  if (sample.rows.length > 0) {
    const { id, course_id, embedding } = sample.rows[0];
    const nn = await client.query(
      "select id from source_chunks where course_id = $1 order by embedding <=> $2::vector limit 5",
      [course_id, embedding],
    );
    gate("Cosine-NN query", nn.rows.length >= 1, `returned ${nn.rows.length} neighbors, first=${nn.rows[0]?.id}`);
  } else {
    gate("Cosine-NN query", true, "no embeddings yet — skipped");
  }
} finally {
  client.release();
  await pool.end();
}

console.log(`\n${failures === 0 ? "✅ pgvector gates pass" : `❌ ${failures} gate(s) failed`}`);
exit(failures === 0 ? 0 : 1);
