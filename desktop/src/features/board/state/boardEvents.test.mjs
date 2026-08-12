import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBoardEventTemplate,
  buildBoardState,
  buildBoardSnapshot,
  buildCardEventTemplate,
} from "./boardEvents.ts";

const OWNER = "a".repeat(64);
const OTHER_OWNER = "b".repeat(64);

function event({ id, kind, tags, content, createdAt = 1, pubkey = OWNER }) {
  return {
    id,
    kind,
    tags,
    content: JSON.stringify(content),
    created_at: createdAt,
    pubkey,
    sig: "c".repeat(128),
  };
}

test("buildBoardSnapshot selects the newest addressable heads and reads card placement from tags", () => {
  const board = event({
    id: "board-v1",
    kind: 30623,
    tags: [["d", "operations"]],
    content: {
      title: "Operations",
      lists: [{ id: "backlog", title: "Backlog", rank: "a0" }],
    },
    createdAt: 10,
  });
  const newerCard = event({
    id: "card-v2",
    kind: 30624,
    tags: [
      ["d", "card-1"],
      ["a", `30623:${OWNER}:operations`],
      ["l", "backlog"],
      ["t", "brand:HVG"],
      ["t", "fn:build"],
      ["p", OTHER_OWNER, "", "executor"],
      ["rank", "m0"],
    ],
    content: {
      title: "Newest card title",
      description: "Ship it",
      assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
      executionState: "eligible",
      createdBy: OWNER,
      comments: [],
    },
    createdAt: 30,
  });
  const olderCard = event({
    id: "card-v1",
    kind: 30624,
    tags: newerCard.tags,
    content: {
      title: "Stale title",
      description: "Old payload",
      assignees: [],
      executionState: "idle",
      createdBy: OWNER,
      comments: [],
    },
    createdAt: 20,
  });

  const snapshot = buildBoardSnapshot([olderCard, board, newerCard]);

  assert.deepEqual(snapshot.boards, [
    {
      address: `30623:${OWNER}:operations`,
      board: {
        id: "operations",
        title: "Operations",
        lists: [{ id: "backlog", title: "Backlog", rank: "a0" }],
      },
      createdAt: 10,
      eventId: "board-v1",
      owner: OWNER,
    },
  ]);
  assert.equal(snapshot.cards.length, 1);
  assert.equal(snapshot.cards[0].eventId, "card-v2");
  assert.deepEqual(snapshot.cards[0].card, {
    id: "card-1",
    title: "Newest card title",
    description: "Ship it",
    brand: "HVG",
    functionArea: "build",
    assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
    executionState: "eligible",
    rank: "m0",
    listId: "backlog",
    boardId: "operations",
    createdBy: OWNER,
    comments: [],
  });
});

test("buildCardEventTemplate writes the Board contract's addressable and indexed tags", () => {
  const template = buildCardEventTemplate({
    boardAddress: `30623:${OWNER}:operations`,
    card: {
      id: "card-1",
      title: "Ship the Board store",
      description: "Persist Board state over Nostr.",
      brand: "hvg.app",
      functionArea: "build",
      assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
      executionState: "eligible",
      rank: "m",
      listId: "backlog",
      boardId: "operations",
      createdBy: OWNER,
      comments: [],
      sourceLineage: {
        fromBoardId: "ideas",
        fromBoardTitle: "Ideas",
        ruleAction: "copy",
        ruleId: "rule-1",
        triggerEventId: "trigger-1",
      },
    },
  });

  assert.equal(template.kind, 30624);
  assert.deepEqual(template.tags, [
    ["d", "card-1"],
    ["a", `30623:${OWNER}:operations`],
    ["l", "backlog"],
    ["t", "brand:hvg.app"],
    ["t", "fn:build"],
    ["p", OTHER_OWNER, "", "executor"],
    ["rank", "m"],
    ["feedRule", "rule-1", "trigger-1"],
    ["e", "trigger-1"],
  ]);
  assert.deepEqual(JSON.parse(template.content), {
    title: "Ship the Board store",
    description: "Persist Board state over Nostr.",
    assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
    executionState: "eligible",
    createdBy: OWNER,
    comments: [],
    sourceLineage: {
      fromBoardId: "ideas",
      fromBoardTitle: "Ideas",
      ruleAction: "copy",
      ruleId: "rule-1",
      triggerEventId: "trigger-1",
    },
  });
});

test("buildBoardEventTemplate indexes the board's brand scope for relay filters", () => {
  const branded = buildBoardEventTemplate({
    id: "kb-board",
    title: "K&B Concrete",
    brandScope: "kb-concrete",
    lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
  });

  assert.equal(branded.kind, 30623);
  assert.deepEqual(branded.tags, [
    ["d", "kb-board"],
    ["t", "brand:kb-concrete"],
  ]);
  assert.deepEqual(JSON.parse(branded.content), {
    title: "K&B Concrete",
    brandScope: "kb-concrete",
    lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
  });

  const unbranded = buildBoardEventTemplate({
    id: "master",
    title: "Unified Master",
    lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
  });
  assert.deepEqual(unbranded.tags, [["d", "master"]]);
});

test("event templates reject ranks outside the a-z alphabet", () => {
  // The cutover script wrote list ranks like "a0"; rankBetween refuses to
  // compute with digits, so every drag against such an entry throws. The
  // template builders are the chokepoint where that data is now stopped.
  assert.throws(() =>
    buildBoardEventTemplate({
      id: "master",
      title: "Unified Master",
      lists: [{ id: "backlog", title: "Backlog", rank: "a0" }],
    }),
  );
  assert.throws(() =>
    buildCardEventTemplate({
      boardAddress: `30623:${OWNER}:operations`,
      card: {
        id: "card-1",
        title: "Ship the Board store",
        description: "Persist Board state over Nostr.",
        brand: "hvg.app",
        functionArea: "build",
        assignees: [],
        executionState: "eligible",
        rank: "m0",
        listId: "backlog",
        boardId: "operations",
        createdBy: OWNER,
        comments: [],
      },
    }),
  );
});

test("buildBoardState re-evaluates a card gate from the latest policy head", () => {
  const card = event({
    id: "card-1",
    kind: 30624,
    tags: [
      ["d", "card-1"],
      ["a", `30623:${OWNER}:operations`],
      ["l", "backlog"],
      ["t", "brand:HVG"],
      ["t", "fn:build"],
      ["p", OTHER_OWNER, "", "executor"],
      ["rank", "m0"],
    ],
    content: {
      title: "Ship it",
      description: "Implement the Board store.",
      assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
      executionState: "eligible",
      createdBy: OWNER,
      comments: [],
    },
  });
  const manualPolicy = event({
    id: "policy-manual",
    kind: 30627,
    tags: [["d", `${OTHER_OWNER}:build`]],
    content: {
      agentId: OTHER_OWNER,
      functionArea: "build",
      autonomyLevel: "manual",
    },
    createdAt: 1,
  });
  const autoPolicy = event({
    id: "policy-auto",
    kind: 30627,
    tags: [["d", `${OTHER_OWNER}:build`]],
    content: {
      agentId: OTHER_OWNER,
      functionArea: "build",
      autonomyLevel: "auto",
    },
    createdAt: 2,
  });

  const gated = buildBoardState([card, manualPolicy]);
  assert.equal(gated.requiresApprovalByCardAddress[cardAddress(card)], true);

  const eligible = buildBoardState([card, manualPolicy, autoPolicy]);
  assert.equal(
    eligible.requiresApprovalByCardAddress[cardAddress(card)],
    false,
  );
});

function cardAddress(card) {
  return `${card.kind}:${card.pubkey}:${card.tags[0][1]}`;
}
