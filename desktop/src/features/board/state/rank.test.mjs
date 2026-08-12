import assert from "node:assert/strict";
import test from "node:test";

import { RANK_FIRST, compareRank, isValidRank, rankBetween } from "./rank.ts";

/** Mirrors how boardEvents sorts a column: rank.localeCompare(rank). */
function sorted(ranks) {
  return [...ranks].sort((a, b) => a.localeCompare(b));
}

test("rankBetween with no neighbours returns the seed rank", () => {
  assert.equal(rankBetween(null, null), RANK_FIRST);
});

test("rankBetween produces a rank strictly before a known successor", () => {
  const rank = rankBetween(null, "n");
  assert.ok(rank < "n", `${rank} should sort before n`);
});

test("rankBetween produces a rank strictly after a known predecessor", () => {
  const rank = rankBetween("n", null);
  assert.ok(rank > "n", `${rank} should sort after n`);
});

test("rankBetween lands strictly between two neighbours", () => {
  const rank = rankBetween("h", "n");
  assert.ok(rank > "h" && rank < "n", `${rank} should sit between h and n`);
});

test("rankBetween splits adjacent single-character ranks by growing length", () => {
  const rank = rankBetween("h", "i");
  assert.ok(rank > "h" && rank < "i", `${rank} should sit between h and i`);
  assert.ok(rank.length > 1, "adjacent digits must extend the string");
});

test("rankBetween rejects a reversed or equal pair", () => {
  assert.throws(() => rankBetween("n", "h"), /before/i);
  assert.throws(() => rankBetween("n", "n"), /before/i);
});

test("rankBetween rejects ranks outside the a-z alphabet", () => {
  assert.throws(() => rankBetween("A", null), /alphabet/i);
  assert.throws(() => rankBetween("h1", null), /alphabet/i);
  assert.throws(() => rankBetween("", null), /alphabet/i);
});

test("generated ranks never end in the lowest digit", () => {
  // A trailing 'a' has no room left below it, which would strand any later
  // insert-before at that position. The generator must never emit one.
  let lower = RANK_FIRST;
  for (let i = 0; i < 200; i += 1) {
    const next = rankBetween(null, lower);
    assert.ok(!next.endsWith("a"), `${next} must not end in 'a'`);
    assert.ok(next < lower);
    lower = next;
  }
});

test("repeatedly inserting between the same neighbours keeps strict order", () => {
  // The pathological drag: always drop into the same gap.
  let low = "h";
  const high = "i";
  for (let i = 0; i < 200; i += 1) {
    const mid = rankBetween(low, high);
    assert.ok(mid > low, `${mid} should sort after ${low}`);
    assert.ok(mid < high, `${mid} should sort before ${high}`);
    low = mid;
  }
});

test("appending to the end of a column stays ordered", () => {
  const ranks = [];
  let last = null;
  for (let i = 0; i < 300; i += 1) {
    last = rankBetween(last, null);
    ranks.push(last);
  }
  assert.deepEqual(ranks, sorted(ranks));
  assert.equal(new Set(ranks).size, ranks.length);
});

test("random insertions anywhere in a column preserve sort order", () => {
  // Deterministic PRNG so a failure is reproducible.
  let seed = 0x5eed;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const column = [rankBetween(null, null)];
  for (let i = 0; i < 500; i += 1) {
    const at = Math.floor(rand() * (column.length + 1));
    const before = at === 0 ? null : column[at - 1];
    const after = at === column.length ? null : column[at];
    const rank = rankBetween(before, after);
    column.splice(at, 0, rank);
  }

  assert.deepEqual(column, sorted(column), "column drifted out of order");
  assert.equal(new Set(column).size, column.length, "ranks must stay unique");
});

test("compareRank breaks ties deterministically by createdAt then id", () => {
  // Contract section 4: two concurrent drags into the same gap both survive,
  // so equal ranks must still order stably rather than flapping.
  const a = { rank: "n", createdAt: 10, id: "b" };
  const b = { rank: "n", createdAt: 10, id: "a" };
  const c = { rank: "n", createdAt: 5, id: "z" };
  const d = { rank: "h", createdAt: 99, id: "z" };

  assert.ok(compareRank(d, a) < 0, "lower rank sorts first");
  assert.ok(compareRank(c, a) < 0, "older createdAt breaks a rank tie");
  assert.ok(compareRank(b, a) < 0, "event id breaks a createdAt tie");
  assert.equal(compareRank(a, a), 0);
});

test("compareRank orders a shuffled column identically to localeCompare", () => {
  const entries = ["n", "h", "u", "hn", "an", "z"].map((rank, i) => ({
    rank,
    createdAt: i,
    id: `id${i}`,
  }));
  const viaCompare = [...entries].sort(compareRank).map((e) => e.rank);
  assert.deepEqual(viaCompare, sorted(entries.map((e) => e.rank)));
});

test("isValidRank agrees with rankBetween on every candidate", () => {
  // Two functions encode the same rule; this test fails the moment either
  // changes without the other. Admittance must imply computability — a rank
  // the guard waves through may never make the primitive throw on drag.
  const candidates = ["a", "na", "ba", "n", "u", "z", "hn", "A", "h1", ""];
  for (const rank of candidates) {
    if (isValidRank(rank)) {
      assert.doesNotThrow(
        () => rankBetween(rank, null),
        `guard admitted "${rank}" but rankBetween rejects it`,
      );
    } else {
      assert.throws(
        () => rankBetween(rank, null),
        undefined,
        `guard rejected "${rank}" but rankBetween accepts it`,
      );
    }
  }
  // Spot-check both directions of the trailing-a rule explicitly.
  assert.equal(isValidRank("n"), true);
  assert.equal(isValidRank("a"), false);
  assert.equal(isValidRank("na"), false);
  assert.equal(isValidRank("an"), true);
});
