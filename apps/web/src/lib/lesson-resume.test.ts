import { strict as assert } from "node:assert";
import test from "node:test";
import { resolveResumeBlockId } from "./lesson-resume.ts";

test("resume block resolution clamps to the available lesson blocks", () => {
  const blockIds = ["intro", "basics", "summary"];

  assert.equal(resolveResumeBlockId(blockIds, 0), null);
  assert.equal(resolveResumeBlockId(blockIds, 2), "summary");
  assert.equal(resolveResumeBlockId(blockIds, 8), "summary");
});
