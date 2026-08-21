/**
 * Core type surface for the Buzz Agent OS.
 *
 * This layer is the authoritative, source-controlled specification of the
 * 14-agent workforce: identity, mandate, system prompt, tool/MCP/skill
 * bindings, and routing. It is deliberately additive and separate from the
 * desktop persona store (`AgentDefinition` in
 * `desktop/src-tauri/src/managed_agents/types.rs`), which is runtime state
 * persisted to app data. `toAgentDefinition()` in `project.ts` narrows a
 * config down to the fields that store actually carries.
 */

/** Consumer-facing brand identities. Keys are query-safe slugs. */
export type BrandSlug = "itshvg" | "gomarco" | "lhfyc" | "clean" | "three";

/** The central operating platform. Not a consumer brand. */
export type PlatformSlug = "hvg-app";

/** Anything an agent can be scoped to: the platform, or one of the 5 brands. */
export type ScopeSlug = PlatformSlug | BrandSlug;

/** Stable identifiers for the 14 agents. */
export type AgentId =
  | "icbm"
  | "juve"
  | "otto"
  | "tune"
  | "top"
  | "slim"
  | "roo"
  | "luda"
  | "kodak"
  | "ivy"
  | "pimp"
  | "pata"
  | "boo"
  | "nicki";

/**
 * Opaque, harness-specific model identifier. Buzz stores and passes these
 * through without interpretation (see `AgentDefinition.model`), so this stays
 * a branded string rather than a closed union of provider model names.
 */
export type ModelId = string & { readonly __brand: "ModelId" };

/** Inference provider hint, injected as the runtime's provider env var. */
export type ProviderId =
  | "anthropic"
  | "openai"
  | "google"
  | "moonshot"
  | "databricks";

/** Category buckets used by the MCP registry. */
export type McpCategory =
  | "intelligence-web"
  | "data-sensor"
  | "commerce-billing"
  | "creative-production"
  | "safety-platform"
  | "engineering"
  | "strategy-finance";

/** Permission scopes an agent may hold on an MCP server. */
export type McpPermission = "read" | "write" | "execute" | "admin";

/** A registered MCP server or skill pack. */
export interface McpServerSpec {
  readonly id: string;
  readonly displayName: string;
  readonly category: McpCategory;
  /**
   * `mcp` entries are model-context-protocol servers. `skills` entries are
   * capability packs bound to an agent but not backed by a server process.
   */
  readonly kind: "mcp" | "skills";
  readonly description: string;
  /** Transport endpoint. `null` for skill packs and not-yet-provisioned servers. */
  readonly endpoint: string | null;
  /** Default permissions granted to an agent bound to this server. */
  readonly defaultPermissions: readonly McpPermission[];
  /** Named tools this server exposes. Empty when the surface is not yet fixed. */
  readonly tools: readonly string[];
  /** Env var names the server requires. Values live in Vercel/host env, never here. */
  readonly requiredEnv: readonly string[];
  /** Scopes this server is relevant to. */
  readonly scopes: readonly ScopeSlug[];
  /** `false` until the server is actually provisioned and reachable. */
  readonly provisioned: boolean;
}

/** Where work reaches an agent from, and where it can hand work onward. */
export interface RoutingRules {
  /** Inbound work sources — agent ids, or named external/system sources. */
  readonly inboundSources: readonly string[];
  /** Agents this agent may hand off to. */
  readonly handoffTargets: readonly AgentId[];
  /** Agents this agent escalates to when blocked or out of remit. */
  readonly escalatesTo: readonly AgentId[];
  /** True when this agent's output requires Peter's approval before it ships. */
  readonly requiresHumanApproval: boolean;
}

/** One agent's per-scope operational remit. */
export type ScopeMandates = Readonly<Record<ScopeSlug, string>>;

/** A complete agent definition. */
export interface AgentConfig {
  readonly id: AgentId;
  readonly name: string;
  readonly moniker: string;
  readonly artistPersona: string;
  readonly assignedModel: ModelId;
  readonly provider: ProviderId;
  readonly coreMandate: string;
  readonly systemPrompt: string;
  /** MCP server ids bound to this agent. Must resolve in the registry. */
  readonly mcpServers: readonly string[];
  /** Skill pack ids bound to this agent. Must resolve in the registry. */
  readonly skills: readonly string[];
  /** Free-form capability labels — not registry-backed. */
  readonly tools: readonly string[];
  readonly routingRules: RoutingRules;
  /** Explicit remit across the platform and all five consumer brands. */
  readonly scopeMandates: ScopeMandates;
}
