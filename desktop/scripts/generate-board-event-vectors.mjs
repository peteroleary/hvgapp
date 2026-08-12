#!/usr/bin/env node
/**
 * Regenerates the checked-in cross-language board conformance fixture:
 *   desktop/src/features/board/state/fixtures/boardEventVectors.json
 *
 * Every value is generated from the exported TS source modules — never
 * hand-copied — so the fixture cannot drift from what Desktop actually uses:
 *   - defaultListTitles: ui/boardListDefaults.ts (the standard column set,
 *     born-immutable because lists are CLI-immutable in v1)
 *   - brandSlugs:        ui/brandTokens.ts keys (the locked brand nomenclature)
 *
 * The Rust `buzz board` CLI asserts its mirrored constants against this file
 * (crates/buzz-cli/src/commands/board.rs tests). Spec: PLANS/BUZZ_BOARD_CLI.md,
 * conformance pins 1 and 7.
 *
 * Run from the desktop/ directory (no dependencies required — the source
 * modules are plain TS and strip-types handles them):
 *   node --experimental-strip-types scripts/generate-board-event-vectors.mjs
 *
 * Freshness is pinned by src/features/board/state/boardEventVectors.test.mjs,
 * which recomputes the expected fixture and fails on drift — edit a source
 * module without regenerating and that test goes red.
 */
import { writeFile } from "node:fs/promises";

import { DEFAULT_LIST_TITLES } from "../src/features/board/ui/boardListDefaults.ts";
import { BRAND_TOKENS } from "../src/features/board/ui/brandTokens.ts";

const vectors = {
  generatedBy:
    "desktop/scripts/generate-board-event-vectors.mjs — do not hand-edit",
  spec: "PLANS/BUZZ_BOARD_CLI.md, conformance pins 1 and 7",
  defaultListTitles: DEFAULT_LIST_TITLES,
  brandSlugs: Object.keys(BRAND_TOKENS).sort(),
};

const target = new URL(
  "../src/features/board/state/fixtures/boardEventVectors.json",
  import.meta.url,
);
await writeFile(target, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${target.pathname}`);
