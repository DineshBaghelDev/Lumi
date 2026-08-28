import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const requireFromDb = createRequire(new URL("../../packages/db/package.json", import.meta.url));
const { Pool } = requireFromDb("pg");

export const APPLICATION_TABLES = [
  "users",
  "courses",
  "enrollments",
  "course_generation_usage",
  "course_creation_requests",
  "concepts",
  "concept_dependencies",
  "course_concepts",
  "sources",
  "source_chunks",
  "concept_sources",
  "curricula",
  "modules",
  "lessons",
  "assessments",
  "questions",
  "question_concepts",
  "assessment_questions",
  "assessment_attempts",
  "projects",
  "project_milestones",
  "assets",
  "generation_jobs",
  "lesson_progress",
  "concept_progress",
  "project_progress",
  "user_notes",
  "llm_calls",
  "chat_threads",
  "chat_messages",
];

const quoteIdentifier = (value) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};

export const stableJsonLine = (row) => `${JSON.stringify(row)}\n`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const hardenPostgresUrl = (value) => {
  const url = new URL(value);
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode"))) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
};

const getPrimaryKeyColumns = async (client, table) => {
  const result = await client.query(
    `select a.attname as column_name
       from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = $1::regclass and i.indisprimary
      order by array_position(i.indkey, a.attnum)`,
    [`public.${table}`],
  );
  return result.rows.map((row) => row.column_name);
};

const exportRows = async (client, table) => {
  const primaryKey = await getPrimaryKeyColumns(client, table);
  const order = primaryKey.length > 0
    ? ` order by ${primaryKey.map(quoteIdentifier).join(", ")}`
    : " order by 1";
  const result = await client.query(`select * from public.${quoteIdentifier(table)}${order}`);
  const jsonl = result.rows.map(stableJsonLine).join("");
  return { count: result.rowCount ?? result.rows.length, hash: sha256(jsonl), jsonl, primaryKey };
};

const loadIdentityRows = async (client) => {
  const users = await client.query(`
    select au.id, au.email, au.email_verified, au.profile, au.created_at, au.updated_at
      from auth.users au
      join public.users u on u.auth_user_id = au.id::text
     order by au.id
  `);
  const providers = await client.query(`
    select up.id, up.user_id, up.provider, up.provider_account_id, up.created_at, up.updated_at
      from auth.user_providers up
      join public.users u on u.auth_user_id = up.user_id::text
     order by up.id
  `);
  return { users: users.rows, providers: providers.rows };
};

const validateSource = async (client) => {
  const identity = await client.query(`
      select count(*)::int as total,
             count(*) filter (where auth_user_id is null or auth_user_id = '')::int as missing_auth_ids,
             count(*) filter (where email is null or email = '')::int as missing_emails,
             count(*)::int - count(distinct auth_user_id)::int as duplicate_auth_ids,
             count(*)::int - count(distinct lower(email))::int as duplicate_emails
        from public.users
    `);
  const jobs = await client.query(`select status, count(*)::int as count from public.generation_jobs group by status order by status`);
  const vectors = await client.query(`
      select coalesce(array_agg(distinct vector_dims(embedding)) filter (where embedding is not null), '{}') as dimensions,
             coalesce(array_agg(distinct embedding_model order by embedding_model), '{}') as models,
             coalesce(array_agg(distinct embedding_version order by embedding_version), '{}') as versions,
             count(*) filter (where embedding is null)::int as missing
        from public.source_chunks
    `);
  const constraints = await client.query(`
      select conname, convalidated
        from pg_constraint
       where contype = 'f'
         and conrelid::regclass::text = any($1::text[])
       order by conname
    `, [APPLICATION_TABLES]);

  const identitySummary = identity.rows[0];
  const runningJobs = jobs.rows.find((row) => row.status === "running")?.count ?? 0;
  const vectorSummary = vectors.rows[0];
  const invalidConstraints = constraints.rows.filter((row) => !row.convalidated);
  const problems = [];
  if (runningJobs > 0) problems.push(`${runningJobs} generation jobs are running`);
  for (const field of ["missing_auth_ids", "missing_emails", "duplicate_auth_ids", "duplicate_emails"]) {
    if (identitySummary[field] > 0) problems.push(`${field}=${identitySummary[field]}`);
  }
  if (vectorSummary.dimensions.some((dimension) => dimension !== 384)) {
    problems.push(`unexpected vector dimensions: ${vectorSummary.dimensions.join(",")}`);
  }
  if (invalidConstraints.length > 0) problems.push(`${invalidConstraints.length} foreign keys are not validated`);
  if (problems.length > 0) throw new Error(`Source export blocked: ${problems.join("; ")}`);

  return {
    identities: identitySummary,
    jobs: Object.fromEntries(jobs.rows.map((row) => [row.status, row.count])),
    vectors: vectorSummary,
    foreignKeys: { total: constraints.rowCount, validated: constraints.rowCount },
  };
};

export const exportBaseline = async ({ databaseUrl, outputRoot, dryRun = false }) => {
  if (!databaseUrl) throw new Error("SOURCE_DATABASE_URL or INSFORGE_DB_STRING is required");
  const pool = new Pool({ connectionString: hardenPostgresUrl(databaseUrl), max: 1 });
  const client = await pool.connect();
  try {
    await client.query("begin transaction read only");
    const source = await validateSource(client);
    const tables = {};
    const payloads = {};
    for (const table of APPLICATION_TABLES) {
      const exported = await exportRows(client, table);
      tables[table] = { count: exported.count, sha256: exported.hash, primaryKey: exported.primaryKey };
      payloads[table] = exported.jsonl;
    }
    const identities = await loadIdentityRows(client);
    const identityPayload = `${identities.users.map(stableJsonLine).join("")}${identities.providers.map((row) => stableJsonLine({ ...row, recordType: "provider" })).join("")}`;
    const manifest = {
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      source,
      tables,
      auth: {
        users: identities.users.length,
        providers: identities.providers.length,
        sha256: sha256(identityPayload),
        excludedFields: ["password", "session", "access_token", "refresh_token", "provider_data"],
      },
    };
    await client.query("rollback");
    if (!dryRun) {
      await mkdir(outputRoot, { recursive: true });
      for (const [table, jsonl] of Object.entries(payloads)) {
        await writeFile(resolve(outputRoot, `${table}.jsonl.gz`), gzipSync(jsonl));
      }
      await writeFile(resolve(outputRoot, "auth-identities.jsonl.gz"), gzipSync(identityPayload));
      await writeFile(resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    return manifest;
  } finally {
    client.release();
    await pool.end();
  }
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try { process.loadEnvFile(resolve(".env")); } catch { /* CI may inject env. */ }
  const dryRun = process.argv.includes("--dry-run");
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  const outputRoot = resolve("backups", "infrastructure-migration", stamp);
  const manifest = await exportBaseline({
    databaseUrl: process.env.SOURCE_DATABASE_URL ?? process.env.INSFORGE_DB_STRING,
    outputRoot,
    dryRun,
  });
  console.log(JSON.stringify({ dryRun, outputRoot: dryRun ? null : outputRoot, ...manifest }, null, 2));
}
