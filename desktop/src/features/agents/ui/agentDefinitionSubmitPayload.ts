import { runtimeSupportsLlmProviderSelection } from "./agentConfigOptions";

/**
 * Pure helper extracted from the `handleSubmit` path of `AgentDefinitionDialog`
 * so the payload logic can be unit-tested without rendering the component.
 *
 * Computes the `runtime`, `model`, and `provider` fields for the definition
 * submit payload, resolving auto-seeded builtin-edit semantics: when the
 * runtime was auto-seeded (the user never explicitly chose one), it is omitted
 * from the payload, and model/provider edits are still persisted via the
 * `modelProviderEditableWithoutRuntime` path.
 *
 * Absent-vs-empty contract with the backend (`UpdatePersonaRequest`):
 * - `undefined` (key omitted) = "don't touch the stored value" — used whenever
 *   the control is hidden or the value was never user-chosen. Omitting must
 *   never wipe stored config.
 * - `""` (empty after trimming, while the control is visible) = explicit
 *   "no override — inherit the global layer" — the backend clears the field.
 * - a non-empty string = set.
 */
export function buildRuntimeModelProviderPayload({
  runtime,
  model,
  provider,
  isEditMode,
  isAutoSeeded,
  initialPreviousRuntime,
  initialModelProviderEditableWithoutRuntime,
}: {
  runtime: string;
  model: string;
  provider: string;
  isEditMode: boolean;
  isAutoSeeded: boolean;
  initialPreviousRuntime: string;
  initialModelProviderEditableWithoutRuntime: boolean;
}): {
  runtime: string | undefined;
  model: string | undefined;
  provider: string | undefined;
} {
  const trimmedRuntime = runtime.trim();
  const previousRuntime = initialPreviousRuntime;
  const isAutoSeededRuntimeForBuiltinEdit =
    isEditMode && previousRuntime.length === 0 && isAutoSeeded;
  const runtimeForSubmit = isAutoSeededRuntimeForBuiltinEdit
    ? ""
    : trimmedRuntime;
  // An auto-seeded builtin edit is treated the same as an existing builtin with
  // a saved model/provider: the field is editable without a runtime, and the
  // user's model/provider choice is persisted in the payload.
  const modelProviderEditableWithoutRuntime =
    (initialModelProviderEditableWithoutRuntime ||
      isAutoSeededRuntimeForBuiltinEdit) &&
    runtimeForSubmit.length === 0;
  const llmProviderVisibleForSubmit =
    (runtimeForSubmit.length > 0 &&
      runtimeSupportsLlmProviderSelection(runtimeForSubmit)) ||
    modelProviderEditableWithoutRuntime;
  return {
    runtime: runtimeForSubmit || undefined,
    // Visible + editable: an empty field is a deliberate "inherit from the
    // global layer" choice — send "" so the backend clears the stored value.
    // Hidden (provider-locked runtime): omit the key so the backend preserves
    // the stored value instead of nulling it on an unrelated edit.
    model:
      runtimeForSubmit || modelProviderEditableWithoutRuntime
        ? model.trim()
        : undefined,
    provider: llmProviderVisibleForSubmit ? provider.trim() : undefined,
  };
}
