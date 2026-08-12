import assert from "node:assert/strict";
import test from "node:test";

import { resolveDropRank } from "./dropRank.ts";

function item(id, rank) {
  return { id, rank, createdAt: 1 };
}

test("empty column returns the seed rank", () => {
  const result = resolveDropRank({ column: [], activeId: "a", overId: "list-1" });
  assert.equal(result.rank, "n");
});

test("reorder within column: dropped before first item prepends", () => {
  const column = [item("a", "n"), item("b", "u")];
  const result = resolveDropRank({ column, activeId: "b", overId: "a" });
  assert.ok(result.rank < "n", "new rank must sort before first item");
});

test("reorder within column: downward drop on last item inserts after it", () => {
  const column = [item("a", "n"), item("b", "u")];
  const result = resolveDropRank({ column, activeId: "a", overId: "b" });
  assert.ok(result.rank > "u", "rank must sort after last item");
});

test("reorder within column: dropped on container appends", () => {
  const column = [item("a", "n"), item("b", "u")];
  const result = resolveDropRank({ column, activeId: "a", overId: "list-1" });
  assert.ok(result.rank > "u", "new rank must sort after last item");
});

test("reorder within column: dropped between two items", () => {
  const column = [item("a", "h"), item("b", "n"), item("c", "u")];
  const result = resolveDropRank({ column, activeId: "c", overId: "b" });
  assert.ok(result.rank > "h" && result.rank < "n", "rank must sit between neighbours");
});

test("reorder within column: excludes dragged card from its own neighbour set", () => {
  const column = [item("a", "h"), item("b", "n"), item("c", "u")];
  const result = resolveDropRank({ column, activeId: "b", overId: "a" });
  assert.ok(result.rank < "h", "dragged card must not block a prepend");
});

test("no-op drop on itself returns null", () => {
  const column = [item("a", "h"), item("b", "n"), item("c", "u")];
  const result = resolveDropRank({ column, activeId: "a", overId: "a" });
  assert.equal(result, null);
});

test("no-op drop on container when already last returns null", () => {
  const column = [item("a", "h"), item("b", "n"), item("c", "u")];
  const result = resolveDropRank({ column, activeId: "c", overId: "list-1" });
  assert.equal(result, null);
});

test("no-op drop on container when lone card returns null", () => {
  const column = [item("a", "n")];
  const result = resolveDropRank({ column, activeId: "a", overId: "list-1" });
  assert.equal(result, null);
});

test("cross-column move computes rank in destination column", () => {
  const destColumn = [item("a", "n"), item("b", "u")];
  // Active "y" dropped over "b" in destination (active is not in this column).
  const result = resolveDropRank({
    column: destColumn,
    activeId: "y",
    overId: "b",
  });
  assert.ok(result.rank > "n" && result.rank < "u");
});
