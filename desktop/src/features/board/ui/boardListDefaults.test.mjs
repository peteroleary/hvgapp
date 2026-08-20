import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_LIST_TITLES } from "./boardListDefaults.ts";

// Locked five-column operational template (peter, #build 2026-08-12).
// This array is the single column shape shared with the `buzz board` CLI
// default (PLANS/BUZZ_BOARD_CLI.md). Divergence breaks cross-writer board
// creation because lists are immutable from the CLI in v1.
const LOCKED_LIST_TITLES = [
  "Backlog",
  "Spec\u0027d",
  "In Progress",
  "In Review",
  "Done",
];

test("default list titles match the locked five-column template", () => {
  assert.deepEqual(DEFAULT_LIST_TITLES, LOCKED_LIST_TITLES);
});

test("Spec'd column uses straight ASCII apostrophe (U+0027)", () => {
  const specTitle = DEFAULT_LIST_TITLES[1];
  assert.equal(specTitle.charCodeAt(4), 0x27);
});
