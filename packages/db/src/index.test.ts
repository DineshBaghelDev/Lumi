import { strict as assert } from "node:assert";
import test from "node:test";
import { checkDbConnection, createDbPool } from "./index.ts";

test("creates a provider-neutral PostgreSQL pool", async () => {
  const pool = createDbPool({ databaseUrl: "postgresql://lumi_api:password@localhost:5432/lumi" });
  assert.equal((pool as unknown as { options: { connectionString: string } }).options.connectionString, "postgresql://lumi_api:password@localhost:5432/lumi");
  await pool.end();
});

test("checks PostgreSQL through the shared execute boundary", async () => {
  let called = false;
  await checkDbConnection({ execute: async () => { called = true; return { rows: [] }; } } as never);
  assert.equal(called, true);
});
