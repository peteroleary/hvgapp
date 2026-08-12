//! `buzz board` — Board read/write commands (hvgapp kinds 30623-30627).
//!
//! Spec: PLANS/BUZZ_BOARD_CLI.md. The two const sets below are mirrored
//! from Desktop and pinned cross-language by the conformance fixture
//! (`desktop/.../state/fixtures/boardEventVectors.json`, generated from the
//! TS sources) — change one side without the other and a test goes red.
//! Do not edit casually.

/// The standard column set — one shape, everywhere (Fizz+Prop, #build
/// 2026-08-12). Source of truth: Desktop's exported default-list module
/// (lifted out of `BoardScreen.tsx`; see spec "The standard column set").
///
/// Titles compare byte-exact (`--list` title lookup and Desktop rendering
/// both): straight ASCII apostrophe in `Spec'd`, no curly quotes, no
/// trailing spaces. Lists are immutable from the CLI in v1, so whatever
/// shape a board is born with is the shape it keeps.
#[allow(dead_code)] // wired into `board create` next
pub const DEFAULT_LIST_TITLES: [&str; 5] = [
    "Backlog",
    "Spec'd",
    "In Progress",
    "In Review",
    "Done",
];

/// Brand slugs validated at the write boundary (`--brand` on `board create`
/// and `board card add`). Source of truth:
/// `desktop/src/features/board/ui/brandTokens.ts`. A typo here produces a
/// card no brand filter ever returns — invisible, not broken — so anything
/// outside this set is a hard error, not a warning.
pub const BRAND_SLUGS: [&str; 6] = [
    "clean", "itshvg", "sober", "concrete", "three", "hvg-app",
];

/// Validate a `--brand` value against the locked set. Returns the slug on
/// success so callers can use `?` and keep the value.
#[allow(dead_code)] // wired into `board create` / `board card add` next
pub fn validate_brand(brand: &str) -> Result<&str, crate::error::CliError> {
    if BRAND_SLUGS.contains(&brand) {
        Ok(brand)
    } else {
        Err(crate::error::CliError::Other(format!(
            "unknown brand {brand:?} — expected one of: {}",
            BRAND_SLUGS.join(", ")
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The checked-in cross-language conformance fixture, generated from the
    /// Desktop TS sources by `desktop/scripts/generate-board-event-vectors.mjs`
    /// and freshness-pinned TS-side by `boardEventVectors.test.mjs`.
    /// `include_str!` makes the fixture a compile-time input: editing it
    /// re-runs these assertions on the next build.
    const VECTORS_JSON: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../desktop/src/features/board/state/fixtures/boardEventVectors.json"
    ));

    fn vectors() -> serde_json::Value {
        serde_json::from_str(VECTORS_JSON).expect("boardEventVectors.json parses")
    }

    fn string_array(v: &serde_json::Value, key: &str) -> Vec<String> {
        v[key]
            .as_array()
            .unwrap_or_else(|| panic!("{key} is an array"))
            .iter()
            .map(|s| {
                s.as_str()
                    .unwrap_or_else(|| panic!("{key} entry is a string"))
                    .to_owned()
            })
            .collect()
    }

    /// The Rust column default must equal the fixture generated from
    /// Desktop's `boardListDefaults.ts`, in order. The apostrophe is
    /// additionally asserted as a byte (U+0027), not a literal, so a smart
    /// quote pasted in from a doc goes red instead of slipping through review.
    #[test]
    fn default_list_titles_match_fixture() {
        let fixture_titles = string_array(&vectors(), "defaultListTitles");
        assert_eq!(DEFAULT_LIST_TITLES.as_slice(), fixture_titles.as_slice());
        assert_eq!(DEFAULT_LIST_TITLES[1].as_bytes()[4], 0x27);
    }

    /// The Rust brand set must equal the fixture generated from Desktop's
    /// `brandTokens.ts`. Compared as sorted sets: the const's declaration
    /// order is not load-bearing (only membership is used).
    #[test]
    fn brand_slugs_match_fixture() {
        let fixture_slugs = string_array(&vectors(), "brandSlugs");
        let mut rust_slugs: Vec<String> =
            BRAND_SLUGS.iter().map(|s| s.to_string()).collect();
        rust_slugs.sort_unstable();
        assert_eq!(rust_slugs, fixture_slugs);
    }

    #[test]
    fn validate_brand_rejects_unknown() {
        assert!(validate_brand("clean").is_ok());
        assert!(validate_brand("hvg-app").is_ok());
        assert!(validate_brand("cleanstartup").is_err());
        assert!(validate_brand("Clean").is_err());
        assert!(validate_brand("").is_err());
    }
}
