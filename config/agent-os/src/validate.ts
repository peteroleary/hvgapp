import { AGENTS } from "./agents/index.ts";
import { SCOPE_SLUGS } from "./brands.ts";
import { getMcpServer } from "./mcpRegistry.ts";
import type { AgentConfig, AgentId } from "./types.ts";
import { WORKFLOWS } from "./workflows/index.ts";

/**
 * Terminology permanently retired from the Agent OS. `MoSober` was replaced by
 * Look How Far You've Come (lhfyc.xyz); `K&B Concrete` was removed from the
 * portfolio. `#F59E0B` is a forbidden design token.
 */
export const FORBIDDEN_TERMS: readonly string[] = [
  "MoSober",
  "K&B Concrete",
  "#F59E0B",
];

export interface ValidationIssue {
  readonly severity: "error" | "warning";
  readonly subject: string;
  readonly message: string;
}

function checkBindings(agent: AgentConfig, issues: ValidationIssue[]): void {
  for (const id of agent.mcpServers) {
    const server = getMcpServer(id);
    if (!server) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `binds unregistered MCP server "${id}"`,
      });
    } else if (server.kind !== "mcp") {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `lists skill pack "${id}" under mcpServers`,
      });
    }
  }
  for (const id of agent.skills) {
    const pack = getMcpServer(id);
    if (!pack) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `binds unregistered skill pack "${id}"`,
      });
    } else if (pack.kind !== "skills") {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `lists MCP server "${id}" under skills`,
      });
    }
  }
}

function checkRouting(
  agent: AgentConfig,
  known: ReadonlySet<AgentId>,
  issues: ValidationIssue[],
): void {
  for (const target of agent.routingRules.handoffTargets) {
    if (!known.has(target)) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `hands off to unknown agent "${target}"`,
      });
    }
    if (target === agent.id) {
      issues.push({
        severity: "warning",
        subject: `agent:${agent.id}`,
        message: "hands off to itself",
      });
    }
  }
  for (const target of agent.routingRules.escalatesTo) {
    if (!known.has(target)) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `escalates to unknown agent "${target}"`,
      });
    }
  }
}

function checkScopeCoverage(
  agent: AgentConfig,
  issues: ValidationIssue[],
): void {
  for (const scope of SCOPE_SLUGS) {
    const mandate = agent.scopeMandates[scope];
    if (!mandate || mandate.trim().length === 0) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `missing scope mandate for "${scope}"`,
      });
    }
  }
}

function checkForbiddenTerms(
  agent: AgentConfig,
  issues: ValidationIssue[],
): void {
  const haystack = [
    agent.systemPrompt,
    agent.coreMandate,
    ...Object.values(agent.scopeMandates),
  ]
    .join("\n")
    .toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (haystack.includes(term.toLowerCase())) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: `references forbidden term "${term}"`,
      });
    }
  }
}

function checkWorkflows(issues: ValidationIssue[]): void {
  for (const workflow of WORKFLOWS) {
    const ids = new Set(workflow.states.map((state) => state.id));
    if (!ids.has(workflow.initial)) {
      issues.push({
        severity: "error",
        subject: `workflow:${workflow.id}`,
        message: `initial state "${workflow.initial}" is not defined`,
      });
    }
    for (const state of workflow.states) {
      const targets = Object.entries(state.on);
      for (const [event, target] of targets) {
        if (typeof target === "string" && !ids.has(target)) {
          issues.push({
            severity: "error",
            subject: `workflow:${workflow.id}`,
            message: `state "${state.id}" transition "${event}" targets unknown state "${target}"`,
          });
        }
      }
      if (state.terminal && targets.length > 0) {
        issues.push({
          severity: "error",
          subject: `workflow:${workflow.id}`,
          message: `terminal state "${state.id}" declares outgoing transitions`,
        });
      }
      if (!state.terminal && targets.length === 0) {
        issues.push({
          severity: "error",
          subject: `workflow:${workflow.id}`,
          message: `non-terminal state "${state.id}" has no outgoing transitions`,
        });
      }
    }
    if (!workflow.states.some((state) => state.terminal)) {
      issues.push({
        severity: "error",
        subject: `workflow:${workflow.id}`,
        message: "has no terminal state",
      });
    }
  }
}

/** Full referential-integrity and guardrail audit of the Agent OS config. */
export function validateAgentOs(): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const known = new Set<AgentId>(AGENTS.map((agent) => agent.id));

  if (known.size !== AGENTS.length) {
    issues.push({
      severity: "error",
      subject: "registry",
      message: "duplicate agent ids",
    });
  }

  for (const agent of AGENTS) {
    checkBindings(agent, issues);
    checkRouting(agent, known, issues);
    checkScopeCoverage(agent, issues);
    checkForbiddenTerms(agent, issues);
    if (agent.systemPrompt.trim().length === 0) {
      issues.push({
        severity: "error",
        subject: `agent:${agent.id}`,
        message: "has an empty system prompt",
      });
    }
  }

  checkWorkflows(issues);
  return issues;
}
