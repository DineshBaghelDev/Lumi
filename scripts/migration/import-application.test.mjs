import { strict as assert } from "node:assert";
import test from "node:test";
import { APPLICATION_TABLES } from "./export-insforge.mjs";
import { IMPORT_ORDER, representativeTopK } from "./import-application.mjs";

test("import dependency order is the exact application allowlist", () => {
  assert.equal(IMPORT_ORDER.length, 30);
  assert.deepEqual([...IMPORT_ORDER].sort(), [...APPLICATION_TABLES].sort());
  assert.ok(IMPORT_ORDER.indexOf("users") < IMPORT_ORDER.indexOf("courses"));
  assert.ok(IMPORT_ORDER.indexOf("courses") < IMPORT_ORDER.indexOf("lessons"));
  assert.ok(!IMPORT_ORDER.some((table) => table.includes("migration") || table.startsWith("auth_")));
});

test("representative retrieval is course-scoped and deterministic", () => {
  const rows = [
    { id: "b", course_id: "course-1", embedding: "[1,0]" },
    { id: "a", course_id: "course-1", embedding: "[1,0]" },
    { id: "other", course_id: "course-2", embedding: "[1,0]" },
    { id: "c", course_id: "course-1", embedding: "[0,1]" },
  ];
  assert.deepEqual(representativeTopK(rows, 3)?.ids, ["a", "b", "c"]);
});
