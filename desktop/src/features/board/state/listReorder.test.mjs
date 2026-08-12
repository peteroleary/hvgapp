import assert from "node:assert/strict";
import test from "node:test";

import { reorderLists } from "./listReorder.ts";

function list(id, rank) {
  return { id, rank, title: id };
}

test("reordering two lists assigns a new rank only to the moved list", () => {
  const lists = [list("a", "h"), list("b", "n")];
  const reordered = reorderLists(lists, "b", "a");
  assert.equal(reordered[0].id, "b");
  assert.equal(reordered[1].id, "a");
  assert.ok(
    reordered[0].rank < reordered[1].rank,
    "moved list must sort before the other",
  );
});

test("reordering to the end uses only the previous rank", () => {
  const lists = [list("a", "h"), list("b", "n"), list("c", "u")];
  const reordered = reorderLists(lists, "a", "c");
  const moved = reordered.find((l) => l.id === "a");
  const last = reordered[reordered.length - 1];
  assert.equal(moved.id, last.id);
  assert.ok(moved.rank > "u");
});

test("same-id drop is a no-op", () => {
  const lists = [list("a", "h"), list("b", "n")];
  const reordered = reorderLists(lists, "a", "a");
  assert.equal(reordered, null);
});

test("moving backwards does not recompute ranks for other lists", () => {
  const lists = [list("a", "h"), list("b", "n"), list("c", "u")];
  // Move c to the front. a and b keep their original ranks; c gets a new one.
  const reordered = reorderLists(lists, "c", "a");
  assert.equal(reordered[0].id, "c");
  assert.equal(reordered[0].rank < "h", true);
  assert.equal(reordered[1].id, "a");
  assert.equal(reordered[1].rank, "h");
  assert.equal(reordered[2].id, "b");
  assert.equal(reordered[2].rank, "n");
});
