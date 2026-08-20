import { getMcpServer } from "./mcpRegistry.ts";
import type { AgentConfig } from "./types.ts";

/**
 * The subset of the desktop persona record this config layer can populate.
 *
 * Mirrors `AgentDefinition` in
 * `desktop/src-tauri/src/managed_agents/types.rs` (serde renames it to
 * snake_case on the wire). Fields that store owns at runtime — ids, keys,
 * timestamps, activation — are deliberately absent: this is a seed shape, not
 * a replacement for the store.
 */
export interface AgentDefinitionSeed {
  readonly id: string;
  readonly display_name: string;
  readonly system_prompt: string;
  readonly model: string;
  readonly provider: string;
  readonly name_pool: readonly string[];
  readonly env_vars: Readonly<Record<string, string>>;
}

/**
 * Narrow an `AgentConfig` down to what the desktop persona store actually
 * carries. The richer fields (moniker, artistPersona, coreMandate, tools,
 * mcpServers, skills, routingRules, scopeMandates) have no home in
 * `AgentDefinition`; the MCP bindings survive as an env var so the harness can
 * read them without a schema change.
 */
export function toAgentDefinition(agent: AgentConfig): AgentDefinitionSeed {
  const bindings = [...agent.mcpServers, ...agent.skills];
  const required = new Set<string>();
  for (const id of bindings) {
    for (const key of getMcpServer(id)?.requiredEnv ?? []) {
      required.add(key);
    }
  }

  return {
    id: `agentos:${agent.id}`,
    display_name: agent.name,
    system_prompt: agent.systemPrompt,
    model: agent.assignedModel,
    provider: agent.provider,
    name_pool: [agent.name],
    env_vars: {
      BUZZ_AGENT_OS_ID: agent.id,
      BUZZ_AGENT_OS_MCP: bindings.join(","),
      // Names only. Values are supplied by the host environment.
      BUZZ_AGENT_OS_REQUIRED_ENV: [...required].sort().join(","),
    },
  };
}
