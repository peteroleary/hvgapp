import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENTS, AGENT_IDS, getAgent } from "./agents/index.ts";
import { BRANDS, BRAND_SLUGS, SCOPE_SLUGS } from "./brands.ts";
import { MCP_REGISTRY, getMcpServer } from "./mcpRegistry.ts";
import { FORBIDDEN_TERMS, validateAgentOs } from "./validate.ts";
import { toAgentDefinition } from "./project.ts";
import {
  WORKFLOWS,
  getWorkflow,
  legalEvents,
  nextState,
} from "./workflows/index.ts";

test("the workforce is exactly 14 agents with unique ids", () => {
  assert.equal(AGENTS.length, 14);
  assert.equal(new Set(AGENT_IDS).size, 14);
});

test("every agent declares the full required config surface", () => {
  for (const agent of AGENTS) {
    assert.ok(agent.id, "id");
    assert.ok(agent.name, `${agent.id} name`);
    assert.ok(agent.moniker, `${agent.id} moniker`);
    assert.ok(agent.artistPersona, `${agent.id} artistPersona`);
    assert.ok(agent.assignedModel, `${agent.id} assignedModel`);
    assert.ok(agent.coreMandate, `${agent.id} coreMandate`);
    assert.ok(agent.systemPrompt, `${agent.id} systemPrompt`);
    assert.ok(Array.isArray(agent.tools), `${agent.id} tools`);
    assert.ok(Array.isArray(agent.mcpServers), `${agent.id} mcpServers`);
    assert.ok(Array.isArray(agent.skills), `${agent.id} skills`);
    assert.ok(agent.routingRules, `${agent.id} routingRules`);
  }
});

test("every agent is bound to at least one MCP server", () => {
  for (const agent of AGENTS) {
    assert.ok(
      agent.mcpServers.length > 0,
      `${agent.id} has no MCP server bindings`,
    );
  }
});

test("every agent states a mandate for the platform and all five brands", () => {
  assert.equal(SCOPE_SLUGS.length, 6);
  assert.equal(BRAND_SLUGS.length, 5);
  for (const agent of AGENTS) {
    for (const scope of SCOPE_SLUGS) {
      assert.ok(
        agent.scopeMandates[scope]?.trim(),
        `${agent.id} missing mandate for ${scope}`,
      );
    }
  }
});

test("hvg.app is a platform, not a consumer brand", () => {
  assert.equal(BRANDS["hvg-app"].kind, "platform");
  assert.equal(BRANDS.itshvg.kind, "brand");
  assert.notEqual(BRANDS["hvg-app"].displayName, BRANDS.itshvg.displayName);
  for (const slug of BRAND_SLUGS) {
    assert.equal(BRANDS[slug].kind, "brand");
  }
});

test("Go Marco and lhfyc.xyz are present; retired brands are not", () => {
  assert.equal(BRANDS.gomarco.displayName, "Go Marco");
  assert.equal(BRANDS.lhfyc.domain, "lhfyc.xyz");
  const names = SCOPE_SLUGS.map((s) => BRANDS[s].displayName).join(" ");
  for (const term of ["MoSober", "K&B Concrete"]) {
    assert.ok(!names.includes(term), `retired brand ${term} still registered`);
  }
});

test("no agent prompt or mandate references forbidden terminology", () => {
  for (const agent of AGENTS) {
    const haystack = [
      agent.systemPrompt,
      agent.coreMandate,
      ...Object.values(agent.scopeMandates),
    ]
      .join("\n")
      .toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      assert.ok(
        !haystack.includes(term.toLowerCase()),
        `${agent.id} references "${term}"`,
      );
    }
  }
});

test("every MCP and skill binding resolves in the registry", () => {
  for (const agent of AGENTS) {
    for (const id of agent.mcpServers) {
      assert.equal(getMcpServer(id)?.kind, "mcp", `${agent.id} -> ${id}`);
    }
    for (const id of agent.skills) {
      assert.equal(getMcpServer(id)?.kind, "skills", `${agent.id} -> ${id}`);
    }
  }
});

test("registry ids are unique and secrets are never inlined", () => {
  const ids = MCP_REGISTRY.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const server of MCP_REGISTRY) {
    for (const key of server.requiredEnv) {
      assert.match(key, /^[A-Z0-9_]+$/, `${server.id} env name ${key}`);
    }
  }
});

test("unprovisioned servers declare no live endpoint", () => {
  for (const server of MCP_REGISTRY) {
    if (!server.provisioned) {
      assert.equal(server.endpoint, null, `${server.id} endpoint`);
    }
  }
});

test("every routing handoff and escalation target is a real agent", () => {
  const known = new Set<string>(AGENT_IDS);
  for (const agent of AGENTS) {
    for (const target of agent.routingRules.handoffTargets) {
      assert.ok(known.has(target), `${agent.id} -> ${target}`);
    }
    for (const target of agent.routingRules.escalatesTo) {
      assert.ok(known.has(target), `${agent.id} escalates -> ${target}`);
    }
  }
});

test("the five workflows are defined and reach a terminal state", () => {
  assert.equal(WORKFLOWS.length, 5);
  for (const workflow of WORKFLOWS) {
    const ids = new Set(workflow.states.map((s) => s.id));
    assert.ok(ids.has(workflow.initial), `${workflow.id} initial`);
    assert.ok(
      workflow.states.some((s) => s.terminal),
      `${workflow.id} terminal`,
    );
  }
});

test("the happy path of every workflow terminates", () => {
  for (const workflow of WORKFLOWS) {
    let current = workflow.initial;
    const seen = new Set<string>();
    for (let step = 0; step < 32; step += 1) {
      if (seen.has(current)) break;
      seen.add(current);
      const target = nextState(workflow, current, "advance");
      if (!target) break;
      current = target.id;
    }
    const state = workflow.states.find((s) => s.id === current);
    assert.ok(
      state?.terminal,
      `${workflow.id} advance path ended at ${current}`,
    );
  }
});

test("platform build routes Juve -> Otto & Tune -> Roo -> Top -> Slim -> Boo -> Peter", () => {
  const wf = getWorkflow("platform-build");
  const order = [
    "route",
    "architect",
    "design",
    "build",
    "optimize",
    "search",
    "approval",
  ];
  let current = wf.initial;
  for (const expected of order) {
    assert.equal(current, expected);
    current = nextState(wf, current, "advance")?.id ?? "";
  }
  const architect = wf.states.find((s) => s.id === "architect");
  assert.equal(architect?.owner.kind, "agents");
  if (architect?.owner.kind === "agents") {
    assert.deepEqual([...architect.owner.agents], ["otto", "tune"]);
    assert.equal(architect.owner.concurrent, true);
  }
  const approval = wf.states.find((s) => s.id === "approval");
  assert.equal(approval?.owner.kind, "human");
});

test("lhfyc escrow validates with Slim and Pata concurrently", () => {
  const wf = getWorkflow("lhfyc-escrow");
  const validate = wf.states.find((s) => s.id === "validate");
  assert.equal(validate?.owner.kind, "agents");
  if (validate?.owner.kind === "agents") {
    assert.deepEqual([...validate.owner.agents], ["slim", "pata"]);
    assert.equal(validate.owner.concurrent, true);
  }
});

test("a crisis signal short-circuits the lhfyc flow to human escalation", () => {
  const wf = getWorkflow("lhfyc-escrow");
  for (const state of wf.states) {
    if (state.terminal) continue;
    assert.equal(
      nextState(wf, state.id, "crisis")?.id,
      "escalated",
      `${state.id} has no crisis exit`,
    );
  }
});

test("illegal transitions resolve to null rather than throwing", () => {
  const wf = getWorkflow("hvg-review");
  assert.equal(nextState(wf, "research", "reject"), null);
  assert.ok(legalEvents(wf, "research").includes("advance"));
});

test("workflows that publish externally end behind a human gate", () => {
  for (const id of ["platform-build", "hvg-review"] as const) {
    const wf = getWorkflow(id);
    assert.ok(
      wf.states.some((s) => s.owner.kind === "human"),
      `${id} has no human approval state`,
    );
  }
});

test("agents that ship public output require human approval", () => {
  for (const id of ["luda", "kodak", "ivy", "pimp", "boo", "mia"] as const) {
    assert.equal(
      getAgent(id).routingRules.requiresHumanApproval,
      true,
      `${id} should require approval`,
    );
  }
});

test("projection to the persona seed shape carries no secret values", () => {
  for (const agent of AGENTS) {
    const seed = toAgentDefinition(agent);
    assert.equal(seed.display_name, agent.name);
    assert.equal(seed.system_prompt, agent.systemPrompt);
    assert.equal(seed.env_vars.BUZZ_AGENT_OS_ID, agent.id);
    for (const value of Object.values(seed.env_vars)) {
      assert.ok(!value.includes("sk-"), `${agent.id} leaked a secret`);
    }
  }
});

test("the full audit reports zero errors", () => {
  const issues = validateAgentOs();
  const errors = issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
});
