import assert from "node:assert/strict";
import test from "node:test";

import { buildCreatedGoal } from "./createGoal.ts";

test("buildCreatedGoal publishes an approved SMART goal with empty slots left empty", () => {
  const goal = buildCreatedGoal({
    id: "g1",
    brandScope: "gomarco",
    specific: "Go Marco live for Selina",
  });
  assert.equal(goal.framework, "SMART");
  assert.equal(goal.status, "approved");
  assert.equal(goal.smart.specific, "Go Marco live for Selina");
  assert.equal(goal.smart.measurable, "");
  assert.deepEqual(goal.proposedCards, []);
});

test("buildCreatedGoal rejects a blank specific", () => {
  assert.throws(
    () => buildCreatedGoal({ id: "g1", brandScope: "gomarco", specific: "  " }),
    /specific is required/,
  );
});

test("buildCreatedGoal rejects a blank brandScope", () => {
  assert.throws(
    () =>
      buildCreatedGoal({
        id: "g1",
        brandScope: "",
        specific: "Ship the shell",
      }),
    /brandScope is required/,
  );
});
