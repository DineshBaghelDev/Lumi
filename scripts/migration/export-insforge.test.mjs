import { strict as assert } from "node:assert";
import test from "node:test";
import { APPLICATION_TABLES, hardenPostgresUrl, stableJsonLine } from "./export-insforge.mjs";

test("migration export uses the exact application table allowlist", () => {
  assert.equal(APPLICATION_TABLES.length, 30);
  assert.equal(new Set(APPLICATION_TABLES).size, APPLICATION_TABLES.length);
  assert.ok(APPLICATION_TABLES.includes("users"));
  assert.ok(APPLICATION_TABLES.includes("source_chunks"));
  assert.ok(!APPLICATION_TABLES.some((table) => table.startsWith("auth_")));
});

test("JSONL rows are deterministic and line delimited", () => {
  assert.equal(stableJsonLine({ id: "a", count: 1 }), '{"id":"a","count":1}\n');
});

test("legacy SSL modes retain strict certificate verification", () => {
  assert.match(hardenPostgresUrl("postgres://u:p@example.test/db?sslmode=require"), /sslmode=verify-full/);
});
