import { strict as assert } from "node:assert";
import test from "node:test";
import { instantFeedbackMessage, locksInstantChoice } from "./assessment-state.ts";

test("failed instant feedback does not lock the selected answer", () => {
  assert.equal(locksInstantChoice(null), false);
  assert.equal(locksInstantChoice(undefined), false);
  assert.equal(locksInstantChoice(true), true);
  assert.equal(locksInstantChoice(false), true);
  assert.match(instantFeedbackMessage(null), /try again/);
});
