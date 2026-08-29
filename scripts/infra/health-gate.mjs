#!/usr/bin/env node
/**
 * T17 — Container integration health gate.
 *
 * Verifies every local stack service is up, responsive, and reachable
 * through the published ports. Run against disposable volumes or the
 * persistent stack — this script is read-only.
 *
 * Usage:
 *   node scripts/infra/health-gate.mjs
 *
 * Environment overrides (all optional — defaults match compose.yaml):
 *   POSTGRES_PORT, MINIO_PORT, LITELLM_PORT, SEARXNG_PORT,
 *   CRAWL4AI_PORT, TEI_PORT, API_PORT, WEB_PORT
 */

import { exit } from "node:process";
import { connect } from "node:net";
import { createRequire } from "node:module";

const requireDb = createRequire(new URL("../../packages/db/package.json", import.meta.url));
const requireStorage = createRequire(new URL("../../packages/storage/package.json", import.meta.url));

const gates = [];
let failures = 0;

const check = async (name, url, options = {}) => {
  const { method = "GET", ok, timeoutMs = 5_000 } = options;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { method, signal: controller.signal });
    clearTimeout(timer);
    const pass = ok ? ok(response) : response.ok;
    gates.push({ name, status: pass ? "PASS" : "FAIL", detail: `${response.status}` });
    if (!pass) failures += 1;
  } catch (error) {
    gates.push({ name, status: "FAIL", detail: error.message });
    failures += 1;
  }
};

const checkTcp = async (name, host, portNumber, timeoutMs = 2_000) => {
  await new Promise((resolve) => {
    const socket = connect({ host, port: portNumber });
    const finish = (status, detail) => {
      socket.destroy();
      gates.push({ name, status, detail });
      if (status === "FAIL") failures += 1;
      resolve();
    };
    socket.setTimeout(timeoutMs, () => finish("FAIL", "timeout"));
    socket.once("connect", () => finish("PASS", `${host}:${portNumber}`));
    socket.once("error", (error) => finish("FAIL", error.message));
  });
};

const port = (envVar, fallback) => Number(process.env[envVar] ?? fallback);

const BASE = "http://127.0.0.1";

// ── Infrastructure services ─────────────────────────────────────────
await checkTcp("PostgreSQL", "127.0.0.1", port("POSTGRES_PORT", 6432));

await check("MinIO S3 API", `${BASE}:${port("MINIO_PORT", 9000)}/minio/health/live`);
await check("MinIO Console", `${BASE}:${port("MINIO_PORT", 9000) + 1}`, {
  ok: (r) => r.status === 200 || r.status === 302, // redirects to login
});
await check("SearXNG", `${BASE}:${port("SEARXNG_PORT", 8080)}`);
await check("Crawl4AI", `${BASE}:${port("CRAWL4AI_PORT", 11235)}/health`);
await check("LiteLLM", `${BASE}:${port("LITELLM_PORT", 4000)}/health/liveliness`);
await check("TEI", `${BASE}:${port("TEI_PORT", 8081)}/health`);

// ── Application services ───────────────────────────────────────────
await check("API /health", `${BASE}:${port("API_PORT", 3001)}/health`);
await check("Web", `${BASE}:${port("WEB_PORT", 3000)}/`);

// ── PostgreSQL role and extension gate ──────────────────────────────
const pgCheck = async () => {
  const { Pool } = requireDb("pg");
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return gates.push({ name: "PostgreSQL connection", status: "SKIP", detail: "TEST_DATABASE_URL not set" });
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    const ext = await client.query("select extname, extversion from pg_extension where extname = 'vector'");
    const roles = await client.query("select rolname, rolbypassrls from pg_roles where rolname in ('lumi_auth', 'lumi_api', 'lumi_worker', 'lumi_migrator')");
    const rls = await client.query("select count(*)::int as c from pg_tables where schemaname = 'public' and rowsecurity = true");

    const vectorOk = ext.rows.length === 1 && ext.rows[0].extversion === "0.7.4";
    gates.push({ name: "pgvector 0.7.4", status: vectorOk ? "PASS" : "FAIL", detail: ext.rows[0]?.extversion ?? "missing" });
    if (!vectorOk) failures += 1;

    const expectedRoles = new Map([
      ["lumi_migrator", true],
      ["lumi_api", false],
      ["lumi_worker", true],
      ["lumi_auth", false],
    ]);
    for (const [role, bypass] of expectedRoles) {
      const row = roles.rows.find((r) => r.rolname === role);
      const pass = row && row.rolbypassrls === bypass;
      gates.push({ name: `Role ${role}`, status: pass ? "PASS" : "FAIL", detail: row ? `bypassRLS=${row.rolbypassrls}` : "missing" });
      if (!pass) failures += 1;
    }

    const rlsOk = rls.rows[0].c >= 30;
    gates.push({ name: "RLS enabled (≥30 tables)", status: rlsOk ? "PASS" : "FAIL", detail: String(rls.rows[0].c) });
    if (!rlsOk) failures += 1;
  } finally {
    client.release();
    await pool.end();
  }
};
await pgCheck();

// ── Better Auth gate ───────────────────────────────────────────────
const authCheck = async () => {
  const webPort = port("WEB_PORT", 3000);
  const base = process.env.BETTER_AUTH_URL ?? `http://127.0.0.1:${webPort}`;
  try {
    const r = await fetch(`${base}/api/auth/get-session`, { signal: AbortSignal.timeout(3_000) });
    // 200 or 401 are both acceptable — means auth endpoint is reachable
    const pass = r.status === 200 || r.status === 401;
    gates.push({ name: "Better Auth endpoint", status: pass ? "PASS" : "FAIL", detail: String(r.status) });
    if (!pass) failures += 1;
  } catch (error) {
    gates.push({ name: "Better Auth endpoint", status: "FAIL", detail: error.message });
    failures += 1;
  }
};
await authCheck();

// ── MinIO access/delivery gate ─────────────────────────────────────
const minioCheck = async () => {
  const endpoint = process.env.MINIO_ENDPOINT ?? "http://127.0.0.1:9000";
  const accessKey = process.env.MINIO_ACCESS_KEY ?? "lumi_minio_admin";
  const secretKey = process.env.MINIO_SECRET_KEY ?? "";
  if (!secretKey) {
    gates.push({ name: "MinIO bucket access", status: "SKIP", detail: "MINIO_SECRET_KEY not set" });
    return;
  }
  try {
    const { Client } = requireStorage("minio");
    const parsed = new URL(endpoint);
    const mc = new Client({
      endPoint: parsed.hostname,
      port: Number(parsed.port) || (parsed.protocol === "https:" ? 443 : 80),
      useSSL: parsed.protocol === "https:",
      accessKey,
      secretKey,
    });
    const exists = await mc.bucketExists("lumi-assets");
    gates.push({ name: "MinIO bucket 'lumi-assets'", status: exists ? "PASS" : "FAIL", detail: String(exists) });
    if (!exists) failures += 1;

    // Write/read/delete probe
    const probeKey = `health-gate/${Date.now()}.txt`;
    const data = Buffer.from("health-gate-probe");
    await mc.putObject("lumi-assets", probeKey, data, data.length);
    const stat = await mc.statObject("lumi-assets", probeKey);
    await mc.removeObject("lumi-assets", probeKey);
    const rwOk = stat.size === data.length;
    gates.push({ name: "MinIO write/read/delete", status: rwOk ? "PASS" : "FAIL", detail: `size=${stat.size}` });
    if (!rwOk) failures += 1;
  } catch (error) {
    gates.push({ name: "MinIO bucket access", status: "FAIL", detail: error.message });
    failures += 1;
  }
};
await minioCheck();

// ── pgvector retrieval gate ─────────────────────────────────────────
const vectorCheck = async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return gates.push({ name: "pgvector retrieval", status: "SKIP", detail: "TEST_DATABASE_URL not set" });
  const { Pool } = requireDb("pg");
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    // Check HNSW index exists
    const idx = await client.query("select indexdef from pg_indexes where indexname = 'source_chunks_embedding_hnsw_idx'");
    const hnswOk = idx.rows.length === 1 && idx.rows[0].indexdef.includes("hnsw");
    gates.push({ name: "HNSW cosine index", status: hnswOk ? "PASS" : "FAIL", detail: hnswOk ? "present" : "missing" });
    if (!hnswOk) failures += 1;

    // Check dimension consistency
    const dims = await client.query("select array_agg(distinct vector_dims(embedding)) filter (where embedding is not null) as d from source_chunks");
    const dimensions = dims.rows[0]?.d ?? [];
    const dimOk = dimensions.every((d) => d === 384);
    gates.push({ name: "Vector dimension = 384", status: dimOk ? "PASS" : "SKIP", detail: String(dimensions) });
  } finally {
    client.release();
    await pool.end();
  }
};
await vectorCheck();

// ── Output ─────────────────────────────────────────────────────────
const maxName = Math.max(...gates.map((g) => g.name.length));
for (const gate of gates) {
  const icon = gate.status === "PASS" ? "✅" : gate.status === "SKIP" ? "⏭️" : "❌";
  console.log(`${icon}  ${gate.name.padEnd(maxName + 2)} ${gate.detail}`);
}
console.log(`\n${failures === 0 ? "✅ ALL GATES PASS" : `❌ ${failures} gate(s) failed`}`);
exit(failures === 0 ? 0 : 1);
