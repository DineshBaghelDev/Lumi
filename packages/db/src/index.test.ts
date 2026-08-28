import { strict as assert } from "node:assert";
import test from "node:test";
import { beginRequestTransaction, checkDbConnection, createDbPool } from "./index.ts";

test("creates a provider-neutral PostgreSQL pool", async () => {
  const pool = createDbPool({ databaseUrl: "postgresql://lumi_api:password@localhost:5432/lumi" });
  assert.equal((pool as unknown as { options: { connectionString: string } }).options.connectionString, "postgresql://lumi_api:password@localhost:5432/lumi");
  await pool.end();
});

test("request identity is transaction-local and the pooled client is released", async () => {
  const calls: { text: string; values?: unknown[] }[] = [];
  let released = false;
  const client = {
    query: async (text: string, values?: unknown[]) => { calls.push({ text, ...(values ? { values } : {}) }); return { rows: [] }; },
    release: () => { released = true; },
  };
  const transaction = await beginRequestTransaction({ $client: { connect: async () => client } } as never, "auth-1");
  await transaction.setUserId("user-1");
  await transaction.finish(true);
  assert.deepEqual(calls.map((call) => call.text), [
    "begin",
    "select set_config('lumi.auth_user_id', $1, true)",
    "select set_config('lumi.user_id', $1, true)",
    "commit",
  ]);
  assert.equal(released, true);
});

test("checks PostgreSQL through the shared execute boundary", async () => {
  let called = false;
  await checkDbConnection({ execute: async () => { called = true; return { rows: [] }; } } as never);
  assert.equal(called, true);
});
