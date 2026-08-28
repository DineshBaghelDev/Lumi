import { strict as assert } from "node:assert";
import test from "node:test";
import { passwordOperation } from "./password-policy.ts";

test("password updates enforce length and current-password ownership", () => {
  assert.deepEqual(passwordOperation(false, "", "short"), { error: "New password must contain at least 12 characters." });
  assert.deepEqual(passwordOperation(true, "", "long-enough-password"), { error: "Enter your current password." });
  assert.deepEqual(passwordOperation(false, "", "long-enough-password"), { kind: "set" });
  assert.deepEqual(passwordOperation(true, "old-password", "long-enough-password"), { kind: "change" });
});
