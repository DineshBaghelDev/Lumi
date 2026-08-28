import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { APPLICATION_TABLES, stableJsonLine } from "./export-insforge.mjs";
import { assertLocalDatabaseUrl } from "./import-identities.mjs";

const requireFromDb = createRequire(new URL("../../packages/db/package.json", import.meta.url));
const { Pool } = requireFromDb("pg");

export const IMPORT_ORDER = [
  "users", "courses", "enrollments", "course_generation_usage", "course_creation_requests",
  "concepts", "concept_dependencies", "course_concepts", "sources", "source_chunks", "concept_sources",
  "curricula", "modules", "lessons", "assessments", "questions", "question_concepts",
  "assessment_questions", "assessment_attempts", "projects", "project_milestones", "assets",
  "generation_jobs", "lesson_progress", "concept_progress", "project_progress", "user_notes", "llm_calls",
  "chat_threads", "chat_messages",
];

const quote = (value) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readRows = async (directory, table) => {
  const text = gunzipSync(await readFile(resolve(directory, `${table}.jsonl.gz`))).toString("utf8");
  return { text, rows: text.trim() ? text.trimEnd().split("\n").map(JSON.parse) : [] };
};

const targetColumns = async (client, table) => (await client.query(
  `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
  [table],
)).rows.map((row) => row.column_name);

const insertRows = async (client, table, rows, allowedColumns) => {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]).filter((column) => allowedColumns.includes(column));
  if (!columns.length || rows.some((row) => Object.keys(row).some((column) => !allowedColumns.includes(column)))) {
    throw new Error(`Archive columns do not match target table ${table}`);
  }
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500);
    const values = [];
    const tuples = batch.map((row) => `(${columns.map((column) => `$${values.push(row[column] ?? null)}`).join(",")})`);
    await client.query(`insert into ${quote(table)} (${columns.map(quote).join(",")}) values ${tuples.join(",")}`, values);
  }
};

const parseVector = (value) => String(value).slice(1, -1).split(",").map(Number);
const cosineDistance = (left, right) => {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return 1 - dot / Math.sqrt(leftNorm * rightNorm);
};

export const representativeTopK = (chunks, limit = 5) => {
  const query = chunks.find((chunk) => chunk.embedding);
  if (!query) return null;
  const vector = parseVector(query.embedding);
  const ids = chunks
    .filter((chunk) => chunk.course_id === query.course_id && chunk.embedding)
    .map((chunk) => ({ id: chunk.id, distance: cosineDistance(vector, parseVector(chunk.embedding)) }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((row) => row.id);
  return { courseId: query.course_id, vector: query.embedding, ids };
};

const reconcile = async (client, manifest, archives) => {
  const tables = {};
  for (const table of IMPORT_ORDER) {
    const source = archives[table];
    const columns = source.rows[0] ? Object.keys(source.rows[0]) : [];
    const order = manifest.tables[table].primaryKey.map(quote);
    const result = columns.length
      ? await client.query(`select ${columns.map(quote).join(",")} from ${quote(table)}${order.length ? ` order by ${order.join(",")}` : ""}`)
      : { rows: [] };
    const text = result.rows.map(stableJsonLine).join("");
    tables[table] = { count: result.rows.length, sha256: sha256(text) };
    if (tables[table].count !== manifest.tables[table].count || tables[table].sha256 !== manifest.tables[table].sha256) {
      throw new Error(`Reconciliation mismatch for ${table}`);
    }
  }
  const owners = await client.query(`select count(*)::int as missing from courses where owner_user_id is null`);
  if (owners.rows[0].missing) throw new Error(`${owners.rows[0].missing} courses have no owner`);
  const vectors = await client.query(`select array_agg(distinct vector_dims(embedding)) filter (where embedding is not null) as dimensions from source_chunks`);
  if ((vectors.rows[0].dimensions ?? []).some((dimension) => dimension !== 384)) throw new Error("Imported vector dimensions are not 384");
  const sample = representativeTopK(archives.source_chunks.rows);
  if (sample) {
    const result = await client.query(
      `select id from source_chunks where course_id = $1 order by embedding <=> $2::vector, id limit $3`,
      [sample.courseId, sample.vector, sample.ids.length],
    );
    if (JSON.stringify(result.rows.map((row) => row.id)) !== JSON.stringify(sample.ids)) throw new Error("Representative pgvector ranking changed");
  }
  return { tables, owners: { missing: 0 }, vectors: vectors.rows[0], retrieval: sample ? { courseId: sample.courseId, ids: sample.ids } : null };
};

export const importApplicationData = async ({ archiveDirectory, databaseUrl }) => {
  assertLocalDatabaseUrl(databaseUrl);
  if (IMPORT_ORDER.length !== 30 || new Set(IMPORT_ORDER).size !== 30 || APPLICATION_TABLES.some((table) => !IMPORT_ORDER.includes(table))) {
    throw new Error("Import order must match the exact 30-table application allowlist");
  }
  const manifest = JSON.parse(await readFile(resolve(archiveDirectory, "manifest.json"), "utf8"));
  const archives = {};
  for (const table of IMPORT_ORDER) {
    archives[table] = await readRows(archiveDirectory, table);
    if (sha256(archives[table].text) !== manifest.tables?.[table]?.sha256) throw new Error(`Archive hash mismatch for ${table}`);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  let report;
  try {
    await client.query("begin");
    for (const table of IMPORT_ORDER) {
      const count = await client.query(`select count(*)::int as count from ${quote(table)}`);
      if (count.rows[0].count) throw new Error(`Target table ${table} is not empty`);
    }
    for (const table of IMPORT_ORDER) await insertRows(client, table, archives[table].rows, await targetColumns(client, table));
    const owners = await client.query(`
      select c.id, count(e.user_id)::int as owner_count
      from courses c left join enrollments e on e.course_id = c.id and e.role = 'owner'
      group by c.id having count(e.user_id) <> 1
    `);
    if (owners.rowCount) throw new Error(`${owners.rowCount} courses do not have exactly one owner enrollment`);
    await client.query(`update courses c set owner_user_id = e.user_id from enrollments e where e.course_id = c.id and e.role = 'owner'`);
    report = await reconcile(client, manifest, archives);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  await writeFile(resolve(archiveDirectory, "application-import-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try { process.loadEnvFile(resolve(".env")); } catch { /* CI may inject env. */ }
  const archiveDirectory = process.argv[2];
  if (!archiveDirectory) throw new Error("Usage: node scripts/migration/import-application.mjs <archive-directory>");
  console.log(JSON.stringify(await importApplicationData({ archiveDirectory: resolve(archiveDirectory), databaseUrl: process.env.MIGRATION_DATABASE_URL }), null, 2));
}
