/**
 * Apply the Agent OS rename onto the Buzz desktop persona store.
 *
 * The 14 agents are a re-mandate of the personas already in the store, so
 * this UPDATES records in place — matched by display name via DEPLOYMENT —
 * rather than adding new ones. Persona ids, Nostr keys, instance links, and
 * creation times are all preserved; only name, prompt, model, and runtime
 * change. ICBM has no predecessor and is appended.
 *
 * Instances (records without `slug`) are renamed to follow their persona,
 * keeping their own pubkey and message history.
 *
 * Quit Buzz first — the app owns this file and overwrites external edits.
 *
 * Usage: node --experimental-strip-types scripts/seed-personas.mts [--dry-run]
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAgent } from "../src/agents/index.ts";
import { DEPLOYMENT } from "../src/deployment.ts";
import { getMcpServer } from "../src/mcpRegistry.ts";

type Rec = Record<string, unknown>;

const STORE = join(
  homedir(),
  "Library/Application Support/xyz.block.buzz.app/agents/managed-agents.json",
);

const dryRun = process.argv.includes("--dry-run");
const now = new Date().toISOString();
const store = JSON.parse(readFileSync(STORE, "utf8")) as Rec[];

function envFor(agentId: string): Record<string, string> {
  const agent = getAgent(agentId as never);
  const bindings = [...agent.mcpServers, ...agent.skills];
  const required = new Set<string>();
  for (const id of bindings) {
    for (const key of getMcpServer(id)?.requiredEnv ?? []) required.add(key);
  }
  return {
    BUZZ_AGENT_OS_ID: agent.id,
    BUZZ_AGENT_OS_MONIKER: agent.moniker,
    BUZZ_AGENT_OS_MCP: bindings.join(","),
    BUZZ_AGENT_OS_REQUIRED_ENV: [...required].sort().join(","),
  };
}

const changes: string[] = [];
const renamedPersonaIds = new Map<string, string>(); // persona id -> new name

for (const target of DEPLOYMENT) {
  const agent = getAgent(target.agent);
  const shared = {
    name: agent.name,
    display_name: agent.name,
    system_prompt: agent.systemPrompt,
    model: target.model,
    runtime: target.runtime,
    provider: target.provider,
    name_pool: [agent.name],
    env_vars: envFor(agent.id),
    is_active: true,
    updated_at: now,
  };

  if (target.formerName === null) {
    if (store.some((r) => r.slug === `agentos:${agent.id}`)) continue;
    store.push({
      pubkey: "",
      persona_id: null,
      auth_tag: null,
      relay_url: "",
      avatar_url: null,
      acp_command: "buzz-acp",
      agent_command: "",
      agent_command_override: null,
      agent_args: [],
      mcp_command: "",
      turn_timeout_seconds: 320,
      idle_timeout_seconds: null,
      max_turn_duration_seconds: null,
      parallelism: 10,
      persona_source_version: null,
      start_on_app_launch: false,
      auto_restart_on_config_change: true,
      runtime_pid: null,
      backend: { type: "local" },
      backend_agent_id: null,
      provider_binary_path: null,
      created_at: now,
      last_started_at: null,
      last_stopped_at: null,
      last_exit_code: null,
      last_error: null,
      last_error_code: null,
      respond_to: "owner-only",
      respond_to_allowlist: [],
      slug: `agentos:${agent.id}`,
      is_builtin: false,
      ...shared,
    });
    changes.push(`  + ${agent.name.padEnd(6)} (new persona)`);
    continue;
  }

  // Match on the stable persona id, not the display name: names are the thing
  // this script rewrites, so keying on them would make it a one-shot.
  const def = store.find((r) => r.slug === target.personaId);
  if (!def) {
    changes.push(
      `  ! ${agent.name.padEnd(6)} SKIPPED — no persona id ${target.personaId}`,
    );
    continue;
  }

  const personaId = def.slug as string;
  Object.assign(def, shared);
  renamedPersonaIds.set(personaId, agent.name);
  changes.push(
    `  ~ ${(target.formerName ?? "—").padEnd(7)} -> ${agent.name.padEnd(6)} ${target.model}`,
  );
}

// Follow the rename through to minted instances, and carry the model with it.
// An instance keeps its own model/runtime fields, so renaming alone would leave
// a KDK instance still pointing at whatever Honey ran.
const modelByAgent = new Map(DEPLOYMENT.map((d) => [d.agent, d]));
const agentByPersona = new Map(
  DEPLOYMENT.map((d) => [d.personaId, d.agent] as const),
);

let instances = 0;
for (const rec of store) {
  if (rec.slug) continue;
  const newName = renamedPersonaIds.get(rec.persona_id as string);
  const target = modelByAgent.get(
    agentByPersona.get(rec.persona_id as string) as never,
  );
  let touched = false;
  if (newName && rec.name !== newName) {
    rec.name = newName;
    rec.display_name = newName;
    touched = true;
  }
  if (
    target &&
    (rec.model !== target.model || rec.runtime !== target.runtime)
  ) {
    rec.model = target.model;
    rec.runtime = target.runtime;
    touched = true;
  }
  if (touched) {
    rec.updated_at = now;
    instances += 1;
  }
}

// Buzz re-seeds its built-in "Welcome Team" on launch, minting fresh instances
// for the three personas the 18 were rebased onto. Left alone they accumulate:
// three MFRs and three PATs, each a distinct @mention target. Renaming them
// (above) makes them indistinguishable, so collapse each persona to its oldest
// instance — the one carrying the longest message history.
const dropped: string[] = [];
const byPersona = new Map<string, Record<string, unknown>[]>();
for (const rec of store) {
  if (rec.slug || !rec.persona_id) continue;
  const k = rec.persona_id as string;
  byPersona.set(k, [...(byPersona.get(k) ?? []), rec]);
}
const survivors = new Set<unknown>();
for (const [, recs] of byPersona) {
  if (recs.length < 2) continue;
  const keep = recs
    .slice()
    .sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)),
    )[0];
  for (const r of recs) {
    if (r !== keep) {
      survivors.add(r);
      dropped.push(`${r.name} ${String(r.pubkey).slice(0, 12)}`);
    }
  }
}
if (dropped.length > 0) {
  for (let i = store.length - 1; i >= 0; i -= 1) {
    if (survivors.has(store[i])) store.splice(i, 1);
  }
}

console.log(changes.join("\n"));
if (dropped.length > 0) {
  console.log(
    `\nCollapsed ${dropped.length} duplicate instance(s) re-minted by the built-in Welcome Team:`,
  );
  for (const d of dropped) console.log(`  - ${d}`);
}
console.log(
  `\n${renamedPersonaIds.size} personas renamed, ${instances} instances renamed.`,
);
console.log(`Store holds ${store.length} records.`);

const drift = DEPLOYMENT.filter((d) => d.specModel);
if (drift.length) {
  console.log("\nModel stand-ins (harness string used instead of spec name):");
  for (const d of drift)
    console.log(
      `  ${d.agent.padEnd(5)} ${d.model.padEnd(38)} spec: ${d.specModel}`,
    );
}

if (dryRun) {
  console.log("\n--dry-run: nothing written.");
} else {
  const backup = `${STORE}.bak-agentos-${Date.now()}`;
  copyFileSync(STORE, backup);
  writeFileSync(STORE, `${JSON.stringify(store, null, 2)}\n`);
  console.log(`\nBackup: ${backup}`);
  console.log("Wrote store. Relaunch Buzz.");
}
