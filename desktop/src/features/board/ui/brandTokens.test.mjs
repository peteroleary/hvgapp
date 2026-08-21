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
//
// Revised 2026-08-19: `sober` retired in favour of `lhfyc`, `concrete`
// removed from the portfolio, `gomarco` added.
const LOCKED_BRAND_SLUGS = [
  "clean",
  "gomarco",
  "hvgapp",
  "itshvg",
  "lhfyc",
  "three",
];

// Permanently retired. A slug reappearing here means a revert slipped through.
const RETIRED_BRAND_SLUGS = ["concrete", "sober"];

test("brand registry keys are exactly the locked nomenclature slugs", () => {
  assert.deepEqual(Object.keys(BRAND_TOKENS).sort(), LOCKED_BRAND_SLUGS);
  assert.deepEqual(Object.keys(BRAND_DISPLAY_NAMES).sort(), LOCKED_BRAND_SLUGS);
});

test("every locked slug resolves to its brand display name", () => {
  assert.equal(brandDisplayName("clean"), "Clean Startup");
  assert.equal(brandDisplayName("itshvg"), "High Value Growth");
  assert.equal(brandDisplayName("lhfyc"), "Look How Far You've Come");
  assert.equal(brandDisplayName("gomarco"), "Go Marco");
  assert.equal(brandDisplayName("three"), "We 3 Live");
  assert.equal(brandDisplayName("hvgapp"), "hvg.app");
});

test("retired brand slugs are absent from the registry", () => {
  for (const slug of RETIRED_BRAND_SLUGS) {
    assert.ok(!(slug in BRAND_TOKENS), `${slug} still has brand tokens`);
    assert.ok(
      !(slug in BRAND_DISPLAY_NAMES),
      `${slug} still has a display name`,
    );
  }
});

test("retired brand names never surface as display text", () => {
  const names = Object.values(BRAND_DISPLAY_NAMES).join(" ");
  for (const retired of ["MoSober", "K&B Concrete"]) {
    assert.ok(!names.includes(retired), `${retired} still rendered`);
  }
});

// hvg.app is the Buzz operating platform; High Value Growth is the consumer
// media brand. Conflating them is the failure this pins.
test("the platform slug is distinct from the High Value Growth brand", () => {
  assert.notEqual(BRAND_DISPLAY_NAMES["hvgapp"], BRAND_DISPLAY_NAMES.itshvg);
});

// amber-500 is the forbidden #f59e0b design token.
test("no brand token uses the forbidden amber ramp", () => {
  for (const [slug, token] of Object.entries(BRAND_TOKENS)) {
    const classes = `${token.badge} ${token.border}`;
    assert.ok(!classes.includes("amber"), `${slug} uses the amber ramp`);
  }
});

test("unknown brand slug falls back to the raw value", () => {
  assert.equal(brandDisplayName("some-future-brand"), "some-future-brand");
});
