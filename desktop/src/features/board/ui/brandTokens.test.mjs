import assert from "node:assert/strict";
import test from "node:test";

import {
  BRAND_DISPLAY_NAMES,
  BRAND_TOKENS,
  brandDisplayName,
} from "./brandTokens.ts";

// Locked brand nomenclature (peter, #build 2026-08-12): one name per brand on
// every service — repo, Vercel, Firebase, GCP, and the board slug. These
// slugs are stamped into `card.brand`, `board.brandScope`, and the
// relay-indexed `brand:<slug>` tag, so the set is a wire contract, not style.
const LOCKED_BRAND_SLUGS = [
  "clean",
  "concrete",
  "hvg-app",
  "itshvg",
  "sober",
  "three",
];

test("brand registry keys are exactly the locked nomenclature slugs", () => {
  assert.deepEqual(Object.keys(BRAND_TOKENS).sort(), LOCKED_BRAND_SLUGS);
  assert.deepEqual(Object.keys(BRAND_DISPLAY_NAMES).sort(), LOCKED_BRAND_SLUGS);
});

test("every locked slug resolves to its brand display name", () => {
  assert.equal(brandDisplayName("clean"), "Clean Startup");
  assert.equal(brandDisplayName("itshvg"), "HVG");
  assert.equal(brandDisplayName("sober"), "MoSober");
  assert.equal(brandDisplayName("concrete"), "K&B Concrete");
  assert.equal(brandDisplayName("three"), "We3Live");
  assert.equal(brandDisplayName("hvg-app"), "hvg.app");
});

test("unknown brand slug falls back to the raw value", () => {
  assert.equal(brandDisplayName("some-future-brand"), "some-future-brand");
});
