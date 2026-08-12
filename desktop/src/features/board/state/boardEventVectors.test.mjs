import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DEFAULT_LIST_TITLES } from "../ui/boardListDefaults.ts";
import { BRAND_TOKENS } from "../ui/brandTokens.ts";

// Freshness pin for the cross-language conformance fixture consumed by the
// Rust `buzz board` CLI (PLANS/BUZZ_BOARD_CLI.md, conformance pins 1 and 7).
// The expected fixture is recomputed from the source modules here — editing
// a source without re-running the generator goes red, exactly like editing
// the Rust constants without touching this side does.
//
// Regenerate with:
//   node --experimental-strip-types scripts/generate-board-event-vectors.mjs

const fixtureUrl = new URL(
  "./fixtures/boardEventVectors.json",
  import.meta.url,
);

function expectedVectors() {
  return {
    generatedBy:
      "desktop/scripts/generate-board-event-vectors.mjs — do not hand-edit",
    spec: "PLANS/BUZZ_BOARD_CLI.md, conformance pins 1 and 7",
    defaultListTitles: DEFAULT_LIST_TITLES,
    brandSlugs: Object.keys(BRAND_TOKENS).sort(),
  };
}

test("boardEventVectors.json matches a fresh regeneration", async () => {
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
  assert.deepEqual(fixture, expectedVectors());
});

test("fixture Spec'd title uses straight ASCII apostrophe (U+0027)", async () => {
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
  // A hand-edited fixture with a curly quote is invisible in review; the
  // generator can only emit what the source module carries, so check the
  // byte on the checked-in file itself.
  assert.equal(fixture.defaultListTitles[1].charCodeAt(4), 0x27);
});
