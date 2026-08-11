//! Tests for `apply_runtime_model_provider_update` — the tri-state merge for
//! `UpdatePersonaRequest`'s runtime/model/provider fields.
//!
//! The contract: a key absent from the request (`None`) must preserve the
//! stored value, an explicit `null`/blank (`Some(None)`) clears it, and a
//! value sets it. The dialog omits these keys whenever the provider control
//! is hidden (provider-locked runtimes) or the runtime was auto-seeded, so
//! treating absence as "clear" — the old behavior — silently nulled a
//! definition's runtime/model/provider on any unrelated edit.

use super::*;

fn persona() -> AgentDefinition {
    AgentDefinition {
        id: "custom:prop".to_string(),
        display_name: "Prop".to_string(),
        avatar_url: None,
        system_prompt: "You prop things up.".to_string(),
        runtime: Some("goose".to_string()),
        model: Some("kimi-k3".to_string()),
        provider: Some("openai-compat".to_string()),
        name_pool: vec![],
        is_builtin: false,
        is_active: true,
        shared: false,
        source_team: None,
        source_team_persona_slug: None,
        catalog_source: None,
        env_vars: Default::default(),
        respond_to: None,
        respond_to_allowlist: Vec::new(),
        parallelism: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-02T00:00:00Z".to_string(),
    }
}

#[test]
fn absent_fields_preserve_stored_values() {
    let mut persona = persona();
    apply_runtime_model_provider_update(&mut persona, None, None, None);
    assert_eq!(persona.runtime.as_deref(), Some("goose"));
    assert_eq!(persona.model.as_deref(), Some("kimi-k3"));
    assert_eq!(persona.provider.as_deref(), Some("openai-compat"));
}

#[test]
fn explicit_null_clears_stored_values() {
    let mut persona = persona();
    apply_runtime_model_provider_update(&mut persona, Some(None), Some(None), Some(None));
    assert_eq!(persona.runtime, None);
    assert_eq!(persona.model, None);
    assert_eq!(persona.provider, None);
}

#[test]
fn blank_string_clears_stored_value() {
    let mut persona = persona();
    apply_runtime_model_provider_update(&mut persona, Some(Some("  ".to_string())), None, None);
    assert_eq!(persona.runtime, None, "blank after trimming must clear");
    assert_eq!(persona.model.as_deref(), Some("kimi-k3"));
    assert_eq!(persona.provider.as_deref(), Some("openai-compat"));
}

#[test]
fn present_value_sets_and_is_trimmed() {
    let mut persona = persona();
    apply_runtime_model_provider_update(
        &mut persona,
        Some(Some(" buzz-agent ".to_string())),
        Some(Some("kimi-k2.7-code".to_string())),
        None,
    );
    assert_eq!(persona.runtime.as_deref(), Some("buzz-agent"));
    assert_eq!(persona.model.as_deref(), Some("kimi-k2.7-code"));
    assert_eq!(persona.provider.as_deref(), Some("openai-compat"));
}
