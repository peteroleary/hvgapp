import type { AgentId } from "./types.ts";

/**
 * How the 14 Agent OS agents map onto the personas already living in the
 * Buzz desktop store, and which model string each one runs.
 *
 * The 14 are a rename/re-mandate of the existing bee-themed workforce, not a
 * new set: keeping each agent's persona record (and therefore its Nostr
 * keys, instances, and message history) is the point. `formerName` is matched
 * against the stored persona's display name.
 *
 * `model` and `runtime` are the strings this harness is known to accept —
 * taken from personas already running in the store, not from the spec's
 * nominal model names. The spec's `assignedModel` records intent; this
 * records what actually resolves. Where the two differ, `specModel` says so.
 */
export interface DeploymentTarget {
  readonly agent: AgentId;
  /** Display name of the persona this agent replaces; null for a new persona. */
  readonly formerName: string | null;
  /** Harness-resolvable model id. */
  readonly model: string;
  /** ACP runtime that owns this model. */
  readonly runtime: "claude" | "codex" | "kimi" | "goose";
  readonly provider: string | null;
  /** Set when the harness model is a stand-in for the spec's nominal model. */
  readonly specModel: string | null;
}

export const DEPLOYMENT: readonly DeploymentTarget[] = [
  {
    agent: "icbm",
    formerName: null,
    model: "opus[1m]",
    runtime: "claude",
    provider: null,
    specModel: "Claude Fable 5",
  },
  {
    agent: "juve",
    formerName: "Comet",
    model: "gpt-5.6-terra[high]",
    runtime: "codex",
    provider: null,
    specModel: "GPT-5",
  },
  {
    agent: "otto",
    formerName: "Fizz",
    model: "opus[1m]",
    runtime: "claude",
    provider: null,
    specModel: null,
  },
  {
    agent: "tune",
    formerName: "Prop",
    model: "kimi-code/k3",
    runtime: "kimi",
    provider: null,
    specModel: null,
  },
  {
    agent: "top",
    formerName: "Comb",
    model: "kimi-code/kimi-for-coding-highspeed",
    runtime: "kimi",
    provider: null,
    specModel: null,
  },
  {
    agent: "slim",
    formerName: "Slim",
    model: "gpt-5.6-terra[high]",
    runtime: "codex",
    provider: null,
    specModel: "Codex 5.6 Sol",
  },
  {
    agent: "roo",
    formerName: "Bloom",
    model: "opus[1m]",
    runtime: "claude",
    provider: null,
    specModel: null,
  },
  {
    agent: "luda",
    formerName: "Nectar",
    model: "gemini-3.6-flash",
    runtime: "goose",
    provider: "google",
    specModel: "Gemini 3.7 Flash",
  },
  {
    agent: "cruz",
    formerName: "Honey",
    model: "sonnet",
    runtime: "claude",
    provider: null,
    specModel: "Claude Fable 5",
  },
  {
    agent: "ivy",
    formerName: "Sage",
    model: "gpt-5.6-terra[high]",
    runtime: "codex",
    provider: null,
    specModel: "o3 / GPT-5",
  },
  {
    agent: "pimp",
    formerName: "Scout",
    model: "kimi-code/k3",
    runtime: "kimi",
    provider: null,
    specModel: null,
  },
  {
    agent: "pata",
    formerName: "Bumble",
    model: "gemini-3.6-flash",
    runtime: "goose",
    provider: "google",
    specModel: "Gemini 3.7 Flash",
  },
  {
    agent: "boo",
    formerName: "Waggle",
    model: "sonnet",
    runtime: "claude",
    provider: null,
    specModel: null,
  },
  {
    agent: "mia",
    formerName: "Willow",
    model: "gemini-3.6-flash",
    runtime: "goose",
    provider: "google",
    specModel: "Gemini 3.7 Flash",
  },
];
