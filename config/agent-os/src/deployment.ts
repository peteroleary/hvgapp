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
  /** Stable persona id in the desktop store — the durable join key. */
  readonly personaId: string;
  /** Display name of the persona this agent replaced, for provenance only. */
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
    personaId: "agentos:icbm",
    formerName: null,
    model: "opus[1m]",
    runtime: "claude",
    provider: null,
    specModel: "Claude Fable 5",
  },
  {
    agent: "juve",
    personaId: "336878e0-a248-4a45-86a4-ea031ebb3c33",
    formerName: "Comet",
    model: "gpt-5.6-terra[high]",
    runtime: "codex",
    provider: null,
    specModel: "GPT-5",
  },
  {
    agent: "otto",
    personaId: "builtin:fizz",
    formerName: "Fizz",
    model: "opus[1m]",
    runtime: "claude",
    provider: null,
    specModel: null,
  },
  {
    agent: "tune",
    personaId: "7674d4cd-1a48-43f9-b4f1-5281f8ff0f43",
    formerName: "Prop",
    model: "kimi-code/k3",
    runtime: "kimi",
    provider: null,
    specModel: null,
  },
  {
    agent: "top",
    personaId: "74b13684-4e7c-4646-a8fe-62d511e4a81a",
    formerName: "Comb",
    model: "kimi-code/kimi-for-coding-highspeed",
    runtime: "kimi",
    provider: null,
    specModel: null,
  },
  {
    agent: "slim",
    personaId: "79b32b10-bd71-4732-8949-554540929489",
    formerName: "Slim",
    model: "gpt-5.6-terra[high]",
    runtime: "codex",
    provider: null,
    specModel: "Codex 5.6 Sol",
  },
  {
    agent: "roo",
    personaId: "f9acb68c-11ef-4288-9e3e-f0acfd2e1af2",
    formerName: "Bloom",
    model: "opus[1m]",
    runtime: "claude",
    provider: null,
    specModel: null,
  },
  {
    agent: "luda",
    personaId: "979c807b-0b58-4094-bf3e-dd0dc2fda425",
    formerName: "Nectar",
    model: "gemini-3.6-flash",
    runtime: "goose",
    provider: "google",
    specModel: "Gemini 3.7 Flash",
  },
  {
    agent: "kodak",
    personaId: "builtin:honey",
    formerName: "Honey",
    model: "sonnet",
    runtime: "claude",
    provider: null,
    specModel: "Claude Fable 5",
  },
  {
    agent: "ivy",
    personaId: "98dbd9bb-335a-4679-8a7d-019fbd3f9bcb",
    formerName: "Sage",
    model: "gpt-5.6-terra[high]",
    runtime: "codex",
    provider: null,
    specModel: "o3 / GPT-5",
  },
  {
    agent: "pimp",
    personaId: "a3fb790d-0487-44dd-be01-645393f80636",
    formerName: "Scout",
    model: "kimi-code/k3",
    runtime: "kimi",
    provider: null,
    specModel: null,
  },
  {
    agent: "pata",
    personaId: "builtin:bumble",
    formerName: "Bumble",
    model: "gemini-3.6-flash",
    runtime: "goose",
    provider: "google",
    specModel: "Gemini 3.7 Flash",
  },
  {
    agent: "boo",
    personaId: "1e169326-247e-4563-9971-edb77b4b78a2",
    formerName: "Waggle",
    model: "sonnet",
    runtime: "claude",
    provider: null,
    specModel: null,
  },
  {
    agent: "mia",
    personaId: "f10e36eb-1fc0-406d-81a5-59a93b053b69",
    formerName: "Willow",
    model: "gemini-3.6-flash",
    runtime: "goose",
    provider: "google",
    specModel: "Gemini 3.7 Flash",
  },
];
