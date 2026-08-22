import assert from "node:assert/strict";
import test from "node:test";

import { assembleGoal, goalHeadline } from "./goalDraft.ts";

test("assembleGoal builds a SMART goal from complete fields", () => {
  const goal = assembleGoal("hvgapp-ship", {
    brandScope: "hvgapp",
    framework: "SMART",
    status: "draft",
    specific: "Peter can create a goal from Desktop",
    measurable: "One goal exists on the hvgapp board after refresh",
    attainable: "publishGoal already writes kind 30625",
    relevant: "Goal rollup is dead until goals exist",
    timeBound: "2026-08-22",
  });
  assert.equal(goal.id, "hvgapp-ship");
  assert.equal(goal.framework, "SMART");
  assert.equal(goal.status, "draft");
  assert.equal(goal.brandScope, "hvgapp");
  assert.deepEqual(goal.proposedCards, []);
  assert.equal(goal.smart?.specific, "Peter can create a goal from Desktop");
  assert.equal(goalHeadline(goal), "Peter can create a goal from Desktop");
});

test("assembleGoal builds an OKR goal from objective plus one key result", () => {
  const goal = assembleGoal("clean-launch", {
    brandScope: "clean",
    framework: "OKR",
    objective: "Run Clean capture end to end",
    keyResultDescription: "One home captured",
    keyResultMetric: "homes captured",
  });
  assert.equal(goal.framework, "OKR");
  assert.equal(goal.status, "draft");
  assert.equal(goal.okr?.objective, "Run Clean capture end to end");
  assert.equal(goal.okr?.keyResults[0]?.description, "One home captured");
  assert.equal(goal.okr?.keyResults[0]?.targetMetric, "homes captured");
  assert.equal(goalHeadline(goal), "Run Clean capture end to end");
});

test("assembleGoal builds a PACT goal from all four fields", () => {
  const goal = assembleGoal("lhfyc-habits", {
    brandScope: "lhfyc",
    framework: "PACT",
    purposeful: "Daily proof stays in the user's hands",
    actionable: "Ship the check-in surface",
    continuous: "One check-in per day",
    trackable: "Streak length",
  });
  assert.equal(goal.pact?.purposeful, "Daily proof stays in the user's hands");
  assert.equal(goalHeadline(goal), "Daily proof stays in the user's hands");
});

test("assembleGoal refuses an incomplete SMART draft", () => {
  assert.throws(
    () =>
      assembleGoal("x", {
        brandScope: "hvgapp",
        framework: "SMART",
        specific: "Only this field",
      }),
    /SMART/,
  );
});

test("assembleGoal refuses an OKR with no key result", () => {
  assert.throws(
    () =>
      assembleGoal("x", {
        brandScope: "hvgapp",
        framework: "OKR",
        objective: "Ship",
      }),
    /key result/,
  );
});

test("goalHeadline falls back to the id", () => {
  assert.equal(
    goalHeadline({
      id: "orphan",
      brandScope: "hvgapp",
      framework: "SMART",
      status: "draft",
      proposedCards: [],
    }),
    "orphan",
  );
});
