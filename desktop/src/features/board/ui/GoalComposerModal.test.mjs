import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BoardCardModal } from "./BoardCardModal.tsx";
import { GoalComposerModal } from "./GoalComposerModal.tsx";
import { BoardView } from "../BoardView.tsx";

const MINIMAL_CARD = {
  id: "card-1",
  title: "Test card",
  description: "A card used only for rendering tests",
  brand: "hvgapp",
  functionArea: "build",
  assignees: [],
  executionState: "idle",
  rank: "n",
  listId: "backlog",
  boardId: "hvgapp",
  createdBy: "tester",
  comments: [],
};

const MINIMAL_BOARD = {
  id: "hvgapp",
  title: "hvg.app",
  brandScope: "hvgapp",
  lists: [{ id: "backlog", title: "Backlog", rank: "n" }],
};

const SAMPLE_GOAL = {
  id: "hvgapp-ship",
  brandScope: "hvgapp",
  framework: "OKR",
  status: "approved",
  okr: {
    objective: "Run the operation from the app",
    keyResults: [
      {
        description: "Goal compose ships",
        targetMetric: "1 compose path",
      },
    ],
  },
  proposedCards: [],
};

function contains(html, needle) {
  assert.ok(
    html.includes(needle),
    `expected rendered html to include "${needle}"`,
  );
}

function notContains(html, needle) {
  assert.ok(
    !html.includes(needle),
    `expected rendered html NOT to include "${needle}"`,
  );
}

test("GoalComposerModal renders SMART fields for a new goal", () => {
  const html = renderToStaticMarkup(
    React.createElement(GoalComposerModal, {
      isOpen: true,
      defaultBrand: "hvgapp",
      onClose: () => {},
      onCreateGoal: () => {},
    }),
  );
  contains(html, "New Goal");
  contains(html, 'data-testid="goal-composer"');
  contains(html, "SMART");
  contains(html, "OKR");
  contains(html, "PACT");
  contains(html, "Specific");
  contains(html, "hvg.app");
});

test("GoalComposerModal renders nothing when closed", () => {
  const html = renderToStaticMarkup(
    React.createElement(GoalComposerModal, {
      isOpen: false,
      defaultBrand: "hvgapp",
      onClose: () => {},
      onCreateGoal: () => {},
    }),
  );
  assert.equal(html, "");
});

test("BoardView Goals tab offers New Goal when compose is wired", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardView, {
      board: MINIMAL_BOARD,
      cards: [],
      goals: [SAMPLE_GOAL],
      onCreateGoal: () => {},
    }),
  );
  contains(html, 'data-testid="new-goal"');
  contains(html, "New Goal");
});

test("BoardView Goals tab lists approved goals, not only Comet proposals", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardView, {
      board: MINIMAL_BOARD,
      cards: [],
      goals: [SAMPLE_GOAL],
      onCreateGoal: () => {},
      defaultTab: "goals",
    }),
  );
  contains(html, "Run the operation from the app");
  notContains(html, "No active Comet goal proposals requiring review.");
});

test("BoardCardModal offers a parent-goal selector when goals exist", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCardModal, {
      card: { ...MINIMAL_CARD, parentGoalId: "hvgapp-ship" },
      requiresApproval: false,
      isOpen: true,
      onClose: () => {},
      goals: [SAMPLE_GOAL],
      onSetCardGoal: () => {},
    }),
  );
  contains(html, 'data-testid="parent-goal"');
  contains(html, "hvgapp-ship");
  contains(html, "Run the operation from the app");
});

test("BoardCardModal hides the parent-goal selector without a set handler", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCardModal, {
      card: MINIMAL_CARD,
      requiresApproval: false,
      isOpen: true,
      onClose: () => {},
      goals: [SAMPLE_GOAL],
    }),
  );
  notContains(html, 'data-testid="parent-goal"');
});
