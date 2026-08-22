import assert from "node:assert/strict";
import test from "node:test";

import {
  assigneeDisplayName,
  assigneeInitials,
  collectAssigneePubkeys,
} from "./assigneeNames.ts";

const TUN = "845798e38eb7c9bfdca6df7e18e77650a5b773c2ec56d746034ee9ab748cbb39";
const MFR = "61d06ad75c2119fc39dbd9dd1e9cd1af0ff97423157f8189d0c681f3fc47ab01";

function card(assignees) {
  return { assignees };
}

test("collectAssigneePubkeys dedupes across cards and sorts", () => {
  const cards = [
    card([{ type: "agent", id: TUN }]),
    card([
      { type: "agent", id: MFR },
      { type: "agent", id: TUN },
    ]),
  ];
  assert.deepEqual(collectAssigneePubkeys(cards), [MFR, TUN].sort());
});

test("collectAssigneePubkeys normalizes case and drops blanks", () => {
  const cards = [
    card([
      { type: "agent", id: TUN.toUpperCase() },
      { type: "agent", id: "" },
    ]),
  ];
  assert.deepEqual(collectAssigneePubkeys(cards), [TUN]);
});

test("collectAssigneePubkeys handles a board with no assignees", () => {
  assert.deepEqual(collectAssigneePubkeys([card([])]), []);
});

test("assigneeDisplayName resolves the profile display name", () => {
  const name = assigneeDisplayName(
    { type: "agent", id: TUN },
    { [TUN]: { pubkey: TUN, displayName: "TUN" } },
  );
  assert.equal(name, "TUN");
});

test("assigneeDisplayName falls back to an 8-char prefix, not the full key", () => {
  const name = assigneeDisplayName({ type: "agent", id: TUN }, undefined);
  assert.ok(name.startsWith("845798e3"), `unexpected fallback: ${name}`);
  assert.notEqual(name, TUN);
});

test("assigneeInitials derives initials from the resolved name", () => {
  // The whole point of the fix: an agent handle must not read as hex.
  assert.equal(assigneeInitials("TUN"), "TU");
  assert.equal(assigneeInitials("Peter O'Leary"), "PO");
  assert.equal(assigneeInitials("845798e3…"), "84");
});
