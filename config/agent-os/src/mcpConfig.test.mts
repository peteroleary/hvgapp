import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { OUTPUT_PATH, serialize } from "../scripts/generate-mcp-config.mts";

test("mcp-servers.config.json is current with the TypeScript registry", () => {
  const onDisk = readFileSync(OUTPUT_PATH, "utf8");
  assert.equal(
    onDisk,
    serialize(),
    "mcp-servers.config.json is stale — run `pnpm generate:mcp`",
  );
});
