import type { ModelId } from "./types.ts";

/**
 * Model identifiers are opaque to Buzz — `AgentDefinition.model` is documented
 * as a harness-specific string that the platform "stores and passes through
 * without interpretation". These constants exist so the 14 agent configs share
 * one spelling per model, not to assert that any given id resolves at runtime;
 * resolution is the runtime's job.
 */
export function modelId(value: string): ModelId {
  return value as ModelId;
}

export const MODELS = {
  claudeFable5: modelId("claude-fable-5"),
  claudeOpus5: modelId("claude-opus-5"),
  claudeSonnet5: modelId("claude-sonnet-5"),
  gpt5: modelId("gpt-5"),
  kimiK3: modelId("kimi-k3"),
  kimiCoding27: modelId("kimi-2.7-coding-high-speed"),
  codex56Sol: modelId("codex-5.6-sol"),
  gemini37Flash: modelId("gemini-3.7-flash"),
} as const;
