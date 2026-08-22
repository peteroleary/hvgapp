import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBoardSnapshot,
  buildCardEventTemplate,
  buildGoalEventTemplate,
} from "./boardEvents.ts";
import { assembleGoal, goalHeadline } from "./goalDraft.ts";

const OWNER = "a".repeat(64);
const SIG = "c".repeat(128);

function asEvent(id, template) {
  return {
    id,
    kind: template.kind,
    tags: template.tags,
    content: template.content,
    created_at: 1,
    pubkey: OWNER,
    sig: SIG,
  };
}

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

test("assembled SMART goal survives a snapshot round-trip", () => {
  const goal = assembleGoal("hvgapp-ship", {
    brandScope: "hvgapp",
    framework: "SMART",
    status: "approved",
    specific: "Peter can create a goal from Desktop",
    measurable: "One goal exists after refresh",
    attainable: "publishGoal writes kind 30625",
    relevant: "Cards attach via parentGoalId",
    timeBound: "2026-08-22",
  });
  const snapshot = buildBoardSnapshot([
    asEvent("goal-event", buildGoalEventTemplate(goal)),
  ]);
  assert.equal(snapshot.goals.length, 1);
  assert.equal(snapshot.goals[0].goal.id, "hvgapp-ship");
  assert.equal(snapshot.goals[0].goal.status, "approved");
  assert.equal(
    snapshot.goals[0].goal.smart?.specific,
    "Peter can create a goal from Desktop",
  );
});

test("card parentGoalId survives a snapshot round-trip", () => {
  const template = buildCardEventTemplate({
    boardAddress: `30623:${OWNER}:hvgapp`,
    card: {
      id: "card-1",
      title: "B9",
      description: "Attach me",
      brand: "hvgapp",
      functionArea: "build",
      assignees: [],
      executionState: "idle",
      rank: "n",
      listId: "backlog",
      boardId: "hvgapp",
      createdBy: OWNER,
      comments: [],
      parentGoalId: "hvgapp-ship",
    },
  });
  const snapshot = buildBoardSnapshot([asEvent("card-event", template)]);
  assert.equal(snapshot.cards.length, 1);
  assert.equal(snapshot.cards[0].card.parentGoalId, "hvgapp-ship");
});

test("clearing parentGoalId omits it from the published card", () => {
  const attached = {
    id: "card-1",
    title: "B9",
    description: "Attach me",
    brand: "hvgapp",
    functionArea: "build",
    assignees: [],
    executionState: "idle",
    rank: "n",
    listId: "backlog",
    boardId: "hvgapp",
    createdBy: OWNER,
    comments: [],
    parentGoalId: "hvgapp-ship",
  };
  const detached = { ...attached, parentGoalId: undefined };
  const template = buildCardEventTemplate({
    boardAddress: `30623:${OWNER}:hvgapp`,
    card: detached,
  });
  assert.equal(JSON.parse(template.content).parentGoalId, undefined);
  const snapshot = buildBoardSnapshot([asEvent("card-event", template)]);
  assert.equal(snapshot.cards[0].card.parentGoalId, undefined);
});
