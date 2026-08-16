import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BoardCard } from "./BoardCard.tsx";
import { BoardCardModal } from "./BoardCardModal.tsx";
import { BoardColumn } from "./BoardColumn.tsx";

const MINIMAL_CARD = {
  id: "card-1",
  title: "Test card",
  description: "A card used only for rendering tests",
  brand: "clean",
  functionArea: "build",
  assignees: [],
  executionState: "idle",
  rank: "0",
  listId: "backlog",
  boardId: "board-1",
  createdBy: "tester",
  comments: [],
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

test("BoardCard shows approval badge when requiresApproval is true", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCard, {
      card: MINIMAL_CARD,
      requiresApproval: true,
      onSelectCard: () => {},
    }),
  );
  contains(html, "Needs Approval");
});

test("BoardCard hides approval badge when requiresApproval is false", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCard, {
      card: MINIMAL_CARD,
      requiresApproval: false,
      onSelectCard: () => {},
    }),
  );
  notContains(html, "Needs Approval");
});

test("BoardCardModal shows approval gate when requiresApproval is true", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCardModal, {
      card: MINIMAL_CARD,
      requiresApproval: true,
      isOpen: true,
      onClose: () => {},
      onApproveCard: () => {},
      onRejectCard: () => {},
    }),
  );
  contains(html, "APPROVAL REQUIRED BEFORE EXECUTION");
  contains(html, "Approve &amp; Grant Execution");
  notContains(html, "Auto-Authorized by Autonomy Policy");
});

test("BoardCardModal shows auto-authorized when requiresApproval is false", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCardModal, {
      card: MINIMAL_CARD,
      requiresApproval: false,
      isOpen: true,
      onClose: () => {},
      onApproveCard: () => {},
      onRejectCard: () => {},
    }),
  );
  contains(html, "Auto-Authorized by Autonomy Policy");
  notContains(html, "APPROVAL REQUIRED BEFORE EXECUTION");
});

test("BoardColumn derives requiresApproval from approvalPendingByCardId map", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardColumn, {
      listId: "backlog",
      title: "Backlog",
      cards: [MINIMAL_CARD],
      approvalPendingByCardId: { "card-1": false },
      onSelectCard: () => {},
    }),
  );
  notContains(html, "Needs Approval");
});
