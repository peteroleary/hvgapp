import { DndContext } from "@dnd-kit/core";
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BoardCard } from "./BoardCard.tsx";
import { BoardCardModal } from "./BoardCardModal.tsx";
import { BoardColumn } from "./BoardColumn.tsx";

function renderColumn(props) {
  return renderToStaticMarkup(
    React.createElement(
      DndContext,
      null,
      React.createElement(BoardColumn, props),
    ),
  );
}

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
  const grantedHtml = renderColumn({
    listId: "backlog",
    title: "Backlog",
    cards: [MINIMAL_CARD],
    approvalPendingByCardId: { "card-1": false },
    onSelectCard: () => {},
  });
  notContains(grantedHtml, "Needs Approval");

  const pendingHtml = renderColumn({
    listId: "backlog",
    title: "Backlog",
    cards: [MINIMAL_CARD],
    approvalPendingByCardId: { "card-1": true },
    onSelectCard: () => {},
  });
  contains(pendingHtml, "Needs Approval");
});

const TUN = "845798e38eb7c9bfdca6df7e18e77650a5b773c2ec56d746034ee9ab748cbb39";

const CARD_WITH_ASSIGNEE = {
  ...MINIMAL_CARD,
  assignees: [{ type: "agent", id: TUN, role: "lead" }],
};

const TUN_PROFILES = {
  [TUN]: { pubkey: TUN, displayName: "TUN" },
};

test("BoardCard renders an assignee's handle, never the raw pubkey", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCard, {
      card: CARD_WITH_ASSIGNEE,
      requiresApproval: false,
      onSelectCard: () => {},
      profiles: TUN_PROFILES,
    }),
  );
  // Initials come from the resolved name, so TUN reads "TU" not "84".
  contains(html, "TU");
  contains(html, "TUN (lead)");
  notContains(html, TUN);
});

test("BoardCard falls back to an 8-char prefix when a profile is missing", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCard, {
      card: CARD_WITH_ASSIGNEE,
      requiresApproval: false,
      onSelectCard: () => {},
    }),
  );
  contains(html, "845798e3");
  // The fallback is a prefix, never the whole 64-character key.
  notContains(html, TUN);
});

test("BoardCardModal renders an assignee's handle, not the raw pubkey", () => {
  const html = renderToStaticMarkup(
    React.createElement(BoardCardModal, {
      card: CARD_WITH_ASSIGNEE,
      requiresApproval: false,
      isOpen: true,
      onClose: () => {},
      profiles: TUN_PROFILES,
    }),
  );
  contains(html, "@TUN");
  // The full key stays reachable as a tooltip for copy/paste.
  contains(html, `title="${TUN}"`);
});

test("BoardColumn passes profiles through to its cards", () => {
  const html = renderColumn({
    listId: "backlog",
    title: "Backlog",
    cards: [CARD_WITH_ASSIGNEE],
    onSelectCard: () => {},
    profiles: TUN_PROFILES,
  });
  contains(html, "TUN (lead)");
});
