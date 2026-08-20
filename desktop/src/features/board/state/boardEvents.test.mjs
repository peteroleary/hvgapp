import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildBoardEventTemplate,
  buildBoardState,
  buildBoardSnapshot,
  buildCardEventTemplate,
} from "./boardEvents.ts";

const goldenVectors = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "./fixtures/boardReconciliationGoldenVectors.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
);

const OWNER_PUBKEYS = {
  owner: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  other: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  third: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
};

function mapOwnerPlaceholders(value, pubkeys = OWNER_PUBKEYS) {
  if (typeof value === "string") {
    return value
      .replace(/\bowner\b/g, pubkeys.owner)
      .replace(/\bother\b/g, pubkeys.other)
      .replace(/\bthird\b/g, pubkeys.third);
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapOwnerPlaceholders(item, pubkeys));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapOwnerPlaceholders(item, pubkeys),
      ]),
    );
  }
  return value;
}

const OWNER = "a".repeat(64);
const OTHER_OWNER = "b".repeat(64);
const THIRD_OWNER = "c".repeat(64);

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

function cardEvent({
  id,
  cardId,
  pubkey = OWNER,
  createdAt = 1,
  title = "Card",
  description = "Description",
  assignees = [],
  executionState = "idle",
  listId = "backlog",
  rank = "m",
  brand = "HVG",
  functionArea = "build",
  comments = [],
  createdBy = OWNER,
}) {
  return event({
    id,
    kind: 30624,
    pubkey,
    createdAt,
    tags: [
      ["d", cardId],
      ["a", `30623:${OWNER}:operations`],
      ["l", listId],
      ["t", `brand:${brand}`],
      ["t", `fn:${functionArea}`],
      ...assignees.map((a) => ["p", a.id, "", a.role ?? ""]),
      ["rank", rank],
    ],
    content: {
      title,
      description,
      assignees,
      executionState,
      createdBy,
      comments,
    },
  });
}

function approvalEvent({
  id,
  cardAddress,
  kind,
  pubkey = OWNER,
  createdAt = 1,
  approvers = [],
}) {
  return event({
    id,
    kind,
    pubkey,
    createdAt,
    tags: [["a", cardAddress], ...approvers.map((pubkey) => ["p", pubkey])],
    content: {},
  });
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
      brand: "not-a-real-brand",
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
    ["t", "brand:not-a-real-brand"],
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
    id: "clean-board",
    title: "Clean Startup",
    brandScope: "clean",
    lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
  });

  assert.equal(branded.kind, 30623);
  assert.deepEqual(branded.tags, [
    ["d", "clean-board"],
    ["t", "brand:clean"],
  ]);
  assert.deepEqual(JSON.parse(branded.content), {
    title: "Clean Startup",
    brandScope: "clean",
    lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
  });

  const unbranded = buildBoardEventTemplate({
    id: "master",
    title: "Unified Master",
    lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
  });
  assert.deepEqual(unbranded.tags, [["d", "master"]]);
});

test("event templates reject ranks rankBetween cannot compute with", () => {
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
  // A hand-seeded a/b/c/d board passes the alphabet check but still ends in
  // the lowest digit, which leaves no room to subdivide below it.
  assert.throws(() =>
    buildBoardEventTemplate({
      id: "master",
      title: "Unified Master",
      lists: [{ id: "backlog", title: "Backlog", rank: "a" }],
    }),
  );
  assert.throws(() =>
    buildCardEventTemplate({
      boardAddress: `30623:${OWNER}:operations`,
      card: {
        id: "card-1",
        title: "Ship the Board store",
        description: "Persist Board state over Nostr.",
        brand: "not-a-real-brand",
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
  const card = cardEvent({
    id: "card-1",
    cardId: "card-1",
    assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
    executionState: "eligible",
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
  assert.equal(gated.approvalPendingByCardId["card-1"], true);

  const eligible = buildBoardState([card, manualPolicy, autoPolicy]);
  assert.equal(eligible.approvalPendingByCardId["card-1"], false);
});

test("reconciliation collapses multi-author cards to one head", () => {
  const ownerCard = cardEvent({
    id: "owner-card",
    cardId: "shared-card",
    pubkey: OWNER,
    createdAt: 10,
    title: "Owner title",
    rank: "a",
  });
  const otherCard = cardEvent({
    id: "other-card",
    cardId: "shared-card",
    pubkey: OTHER_OWNER,
    createdAt: 20,
    title: "Other title",
    rank: "b",
  });

  const snapshot = buildBoardSnapshot([ownerCard, otherCard]);
  assert.equal(snapshot.cards.length, 1);
  assert.equal(snapshot.cards[0].eventId, "other-card");
  assert.equal(snapshot.cards[0].owner, OTHER_OWNER);
  assert.equal(snapshot.cards[0].card.title, "Other title");
});

test("reconciliation collapses multi-author boards to one head", () => {
  const ownerBoard = event({
    id: "owner-board",
    kind: 30623,
    pubkey: OWNER,
    createdAt: 10,
    tags: [["d", "shared-board"]],
    content: {
      title: "Owner board",
      lists: [{ id: "a", title: "A", rank: "a" }],
    },
  });
  const otherBoard = event({
    id: "other-board",
    kind: 30623,
    pubkey: OTHER_OWNER,
    createdAt: 20,
    tags: [["d", "shared-board"]],
    content: {
      title: "Other board",
      lists: [
        { id: "a", title: "A", rank: "a" },
        { id: "b", title: "B", rank: "c" },
      ],
    },
  });

  const snapshot = buildBoardSnapshot([ownerBoard, otherBoard]);
  assert.equal(snapshot.boards.length, 1);
  assert.equal(snapshot.boards[0].eventId, "other-board");
  assert.equal(snapshot.boards[0].board.lists.length, 2);
});

test("reconciliation tie-breaks equal created_at by smaller event id", () => {
  const firstCard = cardEvent({
    id: "zzzz",
    cardId: "tie-card",
    pubkey: OWNER,
    createdAt: 10,
    title: "First",
  });
  const secondCard = cardEvent({
    id: "aaaa",
    cardId: "tie-card",
    pubkey: OTHER_OWNER,
    createdAt: 10,
    title: "Second",
  });

  const snapshot = buildBoardSnapshot([firstCard, secondCard]);
  assert.equal(snapshot.cards.length, 1);
  assert.equal(snapshot.cards[0].eventId, "aaaa");
});

test("goals, feed rules and autonomy policies stay author-scoped", () => {
  const ownerGoal = event({
    id: "owner-goal",
    kind: 30625,
    pubkey: OWNER,
    createdAt: 10,
    tags: [["d", "shared-goal"]],
    content: {
      brandScope: "HVG",
      title: "Owner goal",
      framework: "SMART",
      status: "draft",
      proposedCards: [],
    },
  });
  const otherGoal = event({
    id: "other-goal",
    kind: 30625,
    pubkey: OTHER_OWNER,
    createdAt: 20,
    tags: [["d", "shared-goal"]],
    content: {
      brandScope: "HVG",
      title: "Other goal",
      framework: "SMART",
      status: "draft",
      proposedCards: [],
    },
  });

  const snapshot = buildBoardSnapshot([ownerGoal, otherGoal]);
  assert.equal(snapshot.goals.length, 2);
});

test("approval survives a cross-author card write", () => {
  const ownerCard = cardEvent({
    id: "owner-card",
    cardId: "approved-card",
    pubkey: OWNER,
    createdAt: 10,
    assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
    executionState: "eligible",
  });
  const otherCard = cardEvent({
    id: "other-card",
    cardId: "approved-card",
    pubkey: OTHER_OWNER,
    createdAt: 20,
    assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
    executionState: "eligible",
  });
  const approval = approvalEvent({
    id: "approval-1",
    kind: 50002,
    cardAddress: `30624:${OWNER}:approved-card`,
    pubkey: THIRD_OWNER,
    createdAt: 15,
    approvers: [THIRD_OWNER],
  });

  const state = buildBoardState([ownerCard, otherCard, approval]);
  assert.equal(state.cards.length, 1);
  assert.equal(state.cards[0].owner, OTHER_OWNER);
  // The approval event still matches the card after the head moved to another
  // identity, so the effective gate is open even though the card content does
  // not carry an approvalDecision field.
  assert.equal(state.approvalPendingByCardId["approved-card"], false);
});

test("approval tie-break matches card/board rule: smaller event id wins", () => {
  const card = cardEvent({
    id: "card-1",
    cardId: "tie-approval-card",
    pubkey: OWNER,
    createdAt: 1,
    assignees: [{ type: "agent", id: OTHER_OWNER, role: "executor" }],
    executionState: "eligible",
  });
  const denied = approvalEvent({
    id: "zzz-denied",
    kind: 50003,
    cardAddress: `30624:${OWNER}:tie-approval-card`,
    pubkey: THIRD_OWNER,
    createdAt: 10,
  });
  const granted = approvalEvent({
    id: "aaa-granted",
    kind: 50002,
    cardAddress: `30624:${OWNER}:tie-approval-card`,
    pubkey: THIRD_OWNER,
    createdAt: 10,
  });

  const state = buildBoardState([card, denied, granted]);
  assert.equal(state.approvalPendingByCardId["tie-approval-card"], false);
});

test("golden vectors match reconciled state", () => {
  for (const scenario of goldenVectors.scenarios) {
    const events = scenario.events.map((event) => ({
      ...event,
      pubkey: OWNER_PUBKEYS[event.pubkey],
      content: JSON.stringify(
        mapOwnerPlaceholders(event.content, OWNER_PUBKEYS),
      ),
      tags: event.tags.map((tag) =>
        tag.map((value) =>
          typeof value === "string"
            ? mapOwnerPlaceholders(value, OWNER_PUBKEYS)
            : value,
        ),
      ),
    }));

    const state = buildBoardState(events);

    assert.equal(
      state.cards.length,
      scenario.expected.cards.length,
      `${scenario.name}: card count mismatch`,
    );
    for (const expectedCard of scenario.expected.cards) {
      const actual = state.cards.find((c) => c.card.id === expectedCard.id);
      assert.ok(actual, `${scenario.name}: missing card ${expectedCard.id}`);
      assert.equal(
        actual.eventId,
        expectedCard.eventId,
        `${scenario.name}: eventId mismatch for ${expectedCard.id}`,
      );
      assert.equal(
        actual.owner,
        OWNER_PUBKEYS[expectedCard.owner],
        `${scenario.name}: owner mismatch for ${expectedCard.id}`,
      );
      assert.equal(
        actual.card.title,
        expectedCard.title,
        `${scenario.name}: title mismatch for ${expectedCard.id}`,
      );
      if (expectedCard.rank !== undefined) {
        assert.equal(
          actual.card.rank,
          expectedCard.rank,
          `${scenario.name}: rank mismatch for ${expectedCard.id}`,
        );
      }
    }

    assert.equal(
      state.boards.length,
      scenario.expected.boards.length,
      `${scenario.name}: board count mismatch`,
    );
    for (const expectedBoard of scenario.expected.boards) {
      const actual = state.boards.find((b) => b.board.id === expectedBoard.id);
      assert.ok(actual, `${scenario.name}: missing board ${expectedBoard.id}`);
      assert.equal(
        actual.eventId,
        expectedBoard.eventId,
        `${scenario.name}: eventId mismatch for ${expectedBoard.id}`,
      );
      assert.equal(
        actual.owner,
        OWNER_PUBKEYS[expectedBoard.owner],
        `${scenario.name}: owner mismatch for ${expectedBoard.id}`,
      );
      assert.equal(
        actual.board.title,
        expectedBoard.title,
        `${scenario.name}: title mismatch for ${expectedBoard.id}`,
      );
      if (expectedBoard.listCount !== undefined) {
        assert.equal(
          actual.board.lists.length,
          expectedBoard.listCount,
          `${scenario.name}: list count mismatch for ${expectedBoard.id}`,
        );
      }
    }

    if (scenario.expected.approvalPendingByCardId) {
      for (const [cardId, expectedValue] of Object.entries(
        scenario.expected.approvalPendingByCardId,
      )) {
        assert.equal(
          state.approvalPendingByCardId[cardId],
          expectedValue,
          `${scenario.name}: approval gate mismatch for ${cardId}`,
        );
      }
    }
  }
});
