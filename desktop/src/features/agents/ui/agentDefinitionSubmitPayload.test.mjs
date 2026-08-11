import assert from "node:assert/strict";
import test from "node:test";

import { buildRuntimeModelProviderPayload } from "./agentDefinitionSubmitPayload.ts";

// Shared fixture for a builtin edit: previous runtime null, no saved model/provider.
const BUILTIN_EDIT_BASE = {
  isEditMode: true,
  initialPreviousRuntime: "",
  initialModelProviderEditableWithoutRuntime: false,
};

// Contract with the backend (`UpdatePersonaRequest` tri-state):
// - undefined (key omitted) = preserve the stored value
// - "" (blank while the control is visible) = clear the stored value
// - non-empty string = set

// ── edit-untouched ─────────────────────────────────────────────────────────────
//
// User opens a null-runtime builtin, doesn't change model or provider, submits.
// Runtime was auto-seeded (isAutoSeeded=true), model/provider still empty strings.
// Expected: runtime omitted (auto-seeded); model/provider visible-and-editable,
// so empty strings are sent as explicit clears (a no-op on an already-null
// builtin, and a deliberate "inherit from global" on one with saved values).

test("edit-untouched: runtime omitted; visible-but-empty model/provider sent as explicit clears", () => {
  const result = buildRuntimeModelProviderPayload({
    ...BUILTIN_EDIT_BASE,
    runtime: "",
    model: "",
    provider: "",
    isAutoSeeded: true,
  });
  assert.equal(result.runtime, undefined, "runtime must be omitted");
  assert.equal(
    result.model,
    "",
    "visible empty model must be an explicit clear",
  );
  assert.equal(
    result.provider,
    "",
    "visible empty provider must be an explicit clear",
  );
});

// ── edit-model-only ────────────────────────────────────────────────────────────
//
// Transport-level coverage: the serializer remains permissive for legacy and
// non-dialog callers. The separately tested AI configuration mode policy blocks
// a model-only Customize submission in AgentDefinitionDialog.
// Expected: model persisted, runtime omitted (auto-seeded, not explicit).

test("edit-model-only: chosen model persists, runtime omitted on auto-seeded builtin", () => {
  const result = buildRuntimeModelProviderPayload({
    ...BUILTIN_EDIT_BASE,
    runtime: "",
    model: "claude-opus-4-8",
    provider: "",
    isAutoSeeded: true,
  });
  assert.equal(result.runtime, undefined, "runtime must be omitted");
  assert.equal(result.model, "claude-opus-4-8", "model must be persisted");
  assert.equal(result.provider, "", "visible empty provider must clear");
});

// ── edit-provider-only ─────────────────────────────────────────────────────────
//
// Transport-level coverage: the serializer remains permissive for legacy and
// non-dialog callers. The separately tested AI configuration mode policy blocks
// a provider-only Customize submission in AgentDefinitionDialog.
// Expected: provider persisted, model cleared (visible-but-empty), runtime omitted.

test("edit-provider-only: chosen provider persists, runtime omitted on auto-seeded builtin", () => {
  const result = buildRuntimeModelProviderPayload({
    ...BUILTIN_EDIT_BASE,
    runtime: "",
    model: "",
    provider: "anthropic",
    isAutoSeeded: true,
  });
  assert.equal(result.runtime, undefined, "runtime must be omitted");
  assert.equal(result.model, "", "visible empty model must clear");
  assert.equal(result.provider, "anthropic", "provider must be persisted");
});

// ── explicit-runtime-chosen ────────────────────────────────────────────────────
//
// User opens a null-runtime builtin, the seeded default is shown, then the user
// explicitly re-selects the same (or a different) runtime via the dropdown.
// handleRuntimeDropdownChange clears isAutoSeeded=false so the runtime is no
// longer treated as auto-seeded and MUST appear in the payload.

test("explicit-runtime-chosen: runtime and model both persisted when user explicitly selects runtime", () => {
  const result = buildRuntimeModelProviderPayload({
    ...BUILTIN_EDIT_BASE,
    runtime: "buzz-agent",
    model: "claude-opus-4-8",
    provider: "",
    isAutoSeeded: false, // user made an explicit choice
  });
  assert.equal(result.runtime, "buzz-agent", "runtime must be persisted");
  assert.equal(result.model, "claude-opus-4-8", "model must be persisted");
  assert.equal(result.provider, "", "visible empty provider must clear");
});

// ── hidden-provider-preserved (regression: the silent wipe) ──────────────────
//
// Editing a definition whose saved runtime is provider-locked (not
// buzz-agent/goose — e.g. claude, codex, or a custom harness) hides the
// provider control while the harness-specific model control stays visible.
// Omission must preserve the stored provider; before the tri-state backend
// contract, the omitted key was treated as "clear" and any unrelated edit
// (even a rename) silently nulled the definition's provider.

test("hidden-provider-preserved: provider-locked runtime edit omits provider, keeps visible model", () => {
  const result = buildRuntimeModelProviderPayload({
    isEditMode: true,
    initialPreviousRuntime: "claude",
    initialModelProviderEditableWithoutRuntime: false,
    runtime: "claude",
    model: "opus[1m]",
    provider: "",
    isAutoSeeded: false,
  });
  assert.equal(result.runtime, "claude", "runtime must be persisted");
  assert.equal(result.model, "opus[1m]", "visible model must be persisted");
  assert.equal(
    result.provider,
    undefined,
    "hidden provider must be omitted (preserve)",
  );
});

// ── defaults-mode-clears ───────────────────────────────────────────────────────
//
// "Use defaults" AI configuration mode forces model/provider to "" before this
// helper runs (see AgentDefinitionDialog handleSubmit). With a visible,
// LLM-capable runtime those blanks are an explicit clear so the definition
// falls back to the global provider/model layer.

test("defaults-mode-clears: blank model/provider on a capable runtime are explicit clears", () => {
  const result = buildRuntimeModelProviderPayload({
    isEditMode: true,
    initialPreviousRuntime: "goose",
    initialModelProviderEditableWithoutRuntime: false,
    runtime: "goose",
    model: "",
    provider: "",
    isAutoSeeded: false,
  });
  assert.equal(result.runtime, "goose", "runtime must be persisted");
  assert.equal(result.model, "", "blank model must clear to inherit global");
  assert.equal(
    result.provider,
    "",
    "blank provider must clear to inherit global",
  );
});
