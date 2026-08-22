//! `buzz board` — Board read/write commands (hvgapp kinds 30623-30627).
//!
//! Spec: PLANS/BUZZ_BOARD_CLI.md. The event contract lives in TypeScript
//! (`desktop/src/features/board/state/boardEvents.ts`); this module mirrors
//! those templates byte-for-byte and does not invent shapes. The two const
//! sets below are pinned cross-language by the conformance fixture
//! (`desktop/.../state/fixtures/boardEventVectors.json`, generated from the
//! TS sources) — change one side without the other and a test goes red.
//! Do not edit casually.
//!
//! ## Implemented verbs
//! - `board ls [--brand <slug>] [--limit N]` — reconciled board heads.
//! - `board get <board-id>` — board + lists + cards, column-grouped.
//! - `board create --id <slug> --title <t> [--brand <slug>] [--description <d>]
//!   [--lists "Backlog,Spec'd,..."]` — refuses an existing id (any author).
//! - `board card add --board <id> --title <t> --description <d> --brand <slug>
//!   --fn <area> [--list <id|title>] [--assignee <hex>[:role]]... [--goal <id>]`
//! - `board card set --board <id> --card <id> [--title ..] [--description ..]
//!   [--execution-state ..] [--assign <role> <hex>]... [--unassign <hex>]...
//!   [--goal <id>]` — read-modify-write against the reconciled head.
//! - `board card move --board <id> --card <id> --list <id|title>
//!   [--top|--bottom|--before <card>|--after <card>]` — same head discipline.
//! - `board goal create --id <slug> --brand <slug> --framework SMART|OKR|PACT`
//!   plus framework flags. No `--board`: a goal has no board linkage; cards
//!   attach via `parentGoalId`. Refuses an existing id (any author).
//! - `board seed [--dry-run]` — create the standard boards and file the P0 seed
//!   cards. Idempotent: skips existing boards/cards by reconciled head.
//!
//! ## Reconciliation (task-0 rule, spec §5.6)
//! Boards and cards reconcile by `${kind}:${dtag}` across **all** authors:
//! latest `created_at` wins, tie → lexicographically smaller event id. The
//! pubkey is not part of the lookup. Writers read-modify-write the reconciled
//! head, never CLI-supplied state.
//!
//! ## Card→board association
//! A card belongs to a board when its `a` tag parses to a `30623` coordinate
//! whose d-tag equals the board id. Matching is by d-tag, not full address:
//! after a cross-author board overwrite the reconciled head's address changes,
//! and the cards still belong to the board.

use nostr::{Event, EventBuilder, Kind, Tag};

use crate::client::BuzzClient;
use crate::commands::parse_write_response;
use crate::commands::rank::{compare_rank, is_valid_rank, rank_between};
use crate::error::CliError;
use crate::validate::validate_hex64;

use buzz_core::kind::{
    KIND_BOARD, KIND_BOARD_APPROVAL_DENIED, KIND_BOARD_APPROVAL_GRANTED, KIND_BOARD_CARD,
    KIND_BOARD_GOAL,
};

/// The standard column set — one shape, everywhere (Fizz+Prop, #build
/// 2026-08-12). Source of truth: Desktop's exported default-list module
/// (`ui/boardListDefaults.ts`; see spec "The standard column set").
///
/// Titles compare byte-exact (`--list` title lookup and Desktop rendering
/// both): straight ASCII apostrophe in `Spec'd`, no curly quotes, no
/// trailing spaces. Lists are immutable from the CLI in v1, so whatever
/// shape a board is born with is the shape it keeps.
pub const DEFAULT_LIST_TITLES: [&str; 5] =
    ["Backlog", "Spec'd", "In Progress", "In Review", "Done"];

/// Brand slugs validated at the write boundary (`--brand` on `board create`
/// and `board card add`). Source of truth:
/// `desktop/src/features/board/ui/brandTokens.ts`. A typo here produces a
/// card no brand filter ever returns — invisible, not broken — so anything
/// outside this set is a hard error, not a warning.
pub const BRAND_SLUGS: [&str; 6] = ["clean", "itshvg", "lhfyc", "gomarco", "three", "hvgapp"];

/// The Board function taxonomy (`FunctionArea` in `types/boardTypes.ts`).
/// Mirrors `FUNCTION_AREAS` in `boardEvents.ts`.
pub const FUNCTION_AREAS: [&str; 8] = [
    "build",
    "design",
    "content",
    "social",
    "marketing",
    "sales",
    "research",
    "other",
];

/// Card execution states (`CardExecutionState` in `types/boardTypes.ts`).
/// `card add` always writes `idle`; `card set --execution-state` validates
/// against this set.
pub const CARD_EXECUTION_STATES: [&str; 6] = [
    "idle",
    "eligible",
    "running",
    "completed",
    "blocked",
    "needs_approval",
];

/// Assignee roles accepted by `--assignee <hex>[:role]`
/// (`Assignee.role` in `types/boardTypes.ts`).
pub const ASSIGNEE_ROLES: [&str; 3] = ["lead", "reviewer", "executor"];

/// Goal frameworks (`Goal.framework` in `types/boardTypes.ts`). Mirrored for
/// strict goal parsing — `parseGoal` drops events outside this set.
pub const GOAL_FRAMEWORKS: [&str; 3] = ["SMART", "OKR", "PACT"];

/// Goal statuses (`Goal.status` in `types/boardTypes.ts`).
pub const GOAL_STATUSES: [&str; 5] = ["draft", "proposed", "approved", "executing", "completed"];

/// Validate a `--brand` value against the locked set. Returns the slug on
/// success so callers can use `?` and keep the value.
pub fn validate_brand(brand: &str) -> Result<&str, CliError> {
    if BRAND_SLUGS.contains(&brand) {
        Ok(brand)
    } else {
        Err(CliError::Other(format!(
            "unknown brand {brand:?} — expected one of: {}",
            BRAND_SLUGS.join(", ")
        )))
    }
}

/// Validate a `--fn` value against the function taxonomy.
pub fn validate_function_area(area: &str) -> Result<&str, CliError> {
    if FUNCTION_AREAS.contains(&area) {
        Ok(area)
    } else {
        Err(CliError::Usage(format!(
            "unknown function area {area:?} — expected one of: {}",
            FUNCTION_AREAS.join(", ")
        )))
    }
}

/// Validate a `--execution-state` value against the execution-state enum.
fn validate_execution_state(state: &str) -> Result<&str, CliError> {
    if CARD_EXECUTION_STATES.contains(&state) {
        Ok(state)
    } else {
        Err(CliError::Usage(format!(
            "unknown execution state {state:?} — expected one of: {}",
            CARD_EXECUTION_STATES.join(", ")
        )))
    }
}

fn kind_board() -> Kind {
    Kind::Custom(KIND_BOARD as u16)
}

fn kind_board_card() -> Kind {
    Kind::Custom(KIND_BOARD_CARD as u16)
}

fn kind_board_goal() -> Kind {
    Kind::Custom(KIND_BOARD_GOAL as u16)
}

fn parse_events(json: &str) -> Result<Vec<Event>, CliError> {
    serde_json::from_str::<Vec<Event>>(json)
        .map_err(|e| CliError::Other(format!("failed to parse relay response: {e}")))
}

/// The single `d` tag of an event, mirroring `uniqueDTag` in
/// `boardEvents.ts`: exactly one `d` tag with a non-empty value, else None.
fn unique_d_tag(event: &Event) -> Option<&str> {
    let mut d_tags = event
        .tags
        .iter()
        .filter(|t| t.as_slice().first().map(String::as_str) == Some("d"));
    let first = d_tags.next()?;
    if d_tags.next().is_some() {
        return None;
    }
    let value = first.as_slice().get(1).map(String::as_str)?;
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn first_tag<'a>(event: &'a Event, name: &str) -> Option<&'a str> {
    event.tags.iter().find_map(|t| {
        let parts = t.as_slice();
        if parts.first().map(String::as_str) == Some(name) {
            parts.get(1).map(String::as_str)
        } else {
            None
        }
    })
}

fn tag_value_by_prefix<'a>(event: &'a Event, prefix: &str) -> Option<&'a str> {
    event.tags.iter().find_map(|t| {
        let parts = t.as_slice();
        if parts.first().map(String::as_str) == Some("t") {
            parts
                .get(1)
                .map(String::as_str)
                .and_then(|v| v.strip_prefix(prefix))
        } else {
            None
        }
    })
}

/// Reconcile addressable events by d-tag across all authors (task-0 rule):
/// latest `created_at` wins; on equal `created_at` the lexicographically
/// smaller event id wins. Events without a unique non-empty d-tag are
/// skipped, as `selectLatestAddressableEvents` skips them.
pub fn reconcile_by_dtag(events: Vec<Event>) -> Vec<Event> {
    let mut latest: std::collections::HashMap<String, Event> = std::collections::HashMap::new();
    for event in events {
        let Some(d) = unique_d_tag(&event).map(str::to_owned) else {
            continue;
        };
        let wins = match latest.get(&d) {
            None => true,
            Some(existing) => {
                event.created_at > existing.created_at
                    || (event.created_at == existing.created_at
                        && event.id.to_hex() < existing.id.to_hex())
            }
        };
        if wins {
            latest.insert(d, event);
        }
    }
    latest.into_values().collect()
}

/// One Board column as embedded in the board event's content.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct BoardListEntry {
    pub id: String,
    pub title: String,
    pub rank: String,
}

/// Parsed view of a kind:30623 board head.
#[derive(Debug, Clone)]
pub struct BoardSnapshot {
    pub event_id: String,
    pub owner: String,
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub brand_scope: Option<String>,
    pub lists: Vec<BoardListEntry>,
    pub updated_at: u64,
}

impl BoardSnapshot {
    /// Parse a kind:30623 event. Strict in the same places `parseBoard` is:
    /// wrong kind, missing/duplicate d-tag, non-object content, empty title,
    /// or a malformed lists array all reject the event.
    pub fn from_event(event: &Event) -> Result<Self, CliError> {
        if event.kind != kind_board() {
            return Err(CliError::Other(format!(
                "expected kind:{KIND_BOARD}, got {}",
                event.kind.as_u16()
            )));
        }
        let id = unique_d_tag(event)
            .ok_or_else(|| CliError::Other("board event lacks a unique d tag".into()))?
            .to_owned();
        let content: serde_json::Value = serde_json::from_str(&event.content)
            .map_err(|e| CliError::Other(format!("board content is not JSON: {e}")))?;
        let title = content
            .get("title")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .ok_or_else(|| CliError::Other("board content lacks a title".into()))?
            .to_owned();
        let lists_value = content
            .get("lists")
            .and_then(|v| v.as_array())
            .ok_or_else(|| CliError::Other("board content lacks a lists array".into()))?;
        let mut seen_ids = std::collections::HashSet::new();
        let mut lists = Vec::with_capacity(lists_value.len());
        for candidate in lists_value {
            let entry: BoardListEntry = serde_json::from_value(candidate.clone())
                .map_err(|_| CliError::Other("board list entry is malformed".into()))?;
            if entry.id.is_empty() || entry.title.is_empty() || entry.rank.is_empty() {
                return Err(CliError::Other(
                    "board list entry has an empty field".into(),
                ));
            }
            if !seen_ids.insert(entry.id.clone()) {
                return Err(CliError::Other("board list ids are not unique".into()));
            }
            lists.push(entry);
        }
        let opt_string = |key: &str| {
            content
                .get(key)
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(str::to_owned)
        };
        Ok(Self {
            event_id: event.id.to_hex(),
            owner: event.pubkey.to_hex(),
            id,
            title,
            description: opt_string("description"),
            brand_scope: opt_string("brandScope"),
            lists,
            updated_at: event.created_at.as_secs(),
        })
    }

    /// Canonical addressable coordinate `30623:<owner>:<id>`.
    pub fn coordinate(&self) -> String {
        format!("{KIND_BOARD}:{}:{}", self.owner, self.id)
    }
}

/// One card assignee, content form. Field order matches the TS `Assignee`
/// interface (`type`, `id`, `role?`) so serialized content is byte-identical.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct AssigneeEntry {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}

/// One card comment, content form. Field order matches `parseComments`
/// (`id`, `authorId`, `body`, `createdAt`) so re-emitted content is
/// byte-identical to Desktop's.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct CardComment {
    pub id: String,
    #[serde(rename = "authorId")]
    pub author_id: String,
    pub body: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// Parsed view of a kind:30624 card head.
#[derive(Debug, Clone)]
pub struct CardSnapshot {
    pub event_id: String,
    pub owner: String,
    pub id: String,
    pub board_id: String,
    pub list_id: String,
    pub rank: String,
    pub brand: String,
    pub function_area: String,
    pub title: String,
    pub description: String,
    pub execution_state: String,
    pub assignees: Vec<AssigneeEntry>,
    pub created_by: String,
    pub comments: Vec<CardComment>,
    pub linked_git_issue: Option<String>,
    /// Pass-through: the CLI never authors these fields, so the update path
    /// preserves the head's value verbatim rather than re-validating shapes
    /// it does not own. `feedForwardContext`/`approvalDecision`/`sourceLineage`
    /// present-but-not-an-object is still a hard parse error (Desktop's
    /// `parseCard` drops such cards).
    pub feed_forward_context: Option<serde_json::Value>,
    pub parent_goal_id: Option<String>,
    pub source_lineage: Option<serde_json::Value>,
    pub approval_decision: Option<serde_json::Value>,
    pub updated_at: u64,
}

impl CardSnapshot {
    /// Parse a kind:30624 event, strict where `parseCard` is: all indexed
    /// tags present, brand/fn known, content title/description/createdBy
    /// non-empty, execution state in the enum.
    pub fn from_event(event: &Event) -> Result<Self, CliError> {
        if event.kind != kind_board_card() {
            return Err(CliError::Other(format!(
                "expected kind:{KIND_BOARD_CARD}, got {}",
                event.kind.as_u16()
            )));
        }
        let missing = |what: &str| CliError::Other(format!("card event lacks {what}"));
        let id = unique_d_tag(event).ok_or_else(|| missing("a unique d tag"))?;
        let board_address = first_tag(event, "a").ok_or_else(|| missing("an a tag"))?;
        let board_id = parse_board_address_dtag(board_address)
            .ok_or_else(|| missing("a valid 30623 a tag"))?;
        let list_id = first_tag(event, "l").ok_or_else(|| missing("an l tag"))?;
        let rank = first_tag(event, "rank").ok_or_else(|| missing("a rank tag"))?;
        let brand = tag_value_by_prefix(event, "brand:").ok_or_else(|| missing("a brand t tag"))?;
        let function_area =
            tag_value_by_prefix(event, "fn:").ok_or_else(|| missing("an fn t tag"))?;
        if !FUNCTION_AREAS.contains(&function_area) {
            return Err(CliError::Other(format!(
                "card event has unknown fn {function_area:?}"
            )));
        }
        let content: serde_json::Value = serde_json::from_str(&event.content)
            .map_err(|e| CliError::Other(format!("card content is not JSON: {e}")))?;
        let required_string = |key: &str| -> Result<String, CliError> {
            content
                .get(key)
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(str::to_owned)
                .ok_or_else(|| CliError::Other(format!("card content lacks {key}")))
        };
        let execution_state = required_string("executionState")?;
        if !CARD_EXECUTION_STATES.contains(&execution_state.as_str()) {
            return Err(CliError::Other(format!(
                "card event has unknown executionState {execution_state:?}"
            )));
        }
        let assignees: Vec<AssigneeEntry> = content
            .get("assignees")
            .cloned()
            .map(serde_json::from_value)
            .transpose()
            .map_err(|_| CliError::Other("card assignees are malformed".into()))?
            .unwrap_or_default();
        // `parseCard` drops a card whose comments are missing or malformed —
        // the read path is strict so the CLI never "sees" a card Desktop
        // wouldn't render.
        let comments: Vec<CardComment> = content
            .get("comments")
            .cloned()
            .map(serde_json::from_value)
            .transpose()
            .map_err(|_| CliError::Other("card comments are malformed".into()))?
            .ok_or_else(|| CliError::Other("card content lacks comments".into()))?;
        let optional_string = |key: &str| -> Option<String> {
            content
                .get(key)
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(str::to_owned)
        };
        let optional_record = |key: &str| -> Result<Option<serde_json::Value>, CliError> {
            match content.get(key) {
                None | Some(serde_json::Value::Null) => Ok(None),
                Some(v) if v.is_object() => Ok(Some(v.clone())),
                Some(_) => Err(CliError::Other(format!(
                    "card content has a non-object {key}"
                ))),
            }
        };
        Ok(Self {
            event_id: event.id.to_hex(),
            owner: event.pubkey.to_hex(),
            id: id.to_owned(),
            board_id: board_id.to_owned(),
            list_id: list_id.to_owned(),
            rank: rank.to_owned(),
            brand: brand.to_owned(),
            function_area: function_area.to_owned(),
            title: required_string("title")?,
            description: required_string("description")?,
            execution_state,
            assignees,
            created_by: required_string("createdBy")?,
            comments,
            linked_git_issue: optional_string("linkedGitIssue"),
            feed_forward_context: optional_record("feedForwardContext")?,
            parent_goal_id: optional_string("parentGoalId"),
            source_lineage: optional_record("sourceLineage")?,
            approval_decision: optional_record("approvalDecision")?,
            updated_at: event.created_at.as_secs(),
        })
    }

    /// Canonical addressable coordinate `30624:<owner>:<id>`.
    pub fn coordinate(&self) -> String {
        format!("{KIND_BOARD_CARD}:{}:{}", self.owner, self.id)
    }
}

/// Extract the d-tag from a `30623:<pubkey>:<dtag>` coordinate, mirroring
/// `parseAddress(value, KIND_BOARD)`.
fn parse_board_address_dtag(address: &str) -> Option<&str> {
    let mut parts = address.splitn(3, ':');
    let kind = parts.next()?;
    let pubkey = parts.next()?;
    let dtag = parts.next()?;
    if kind == KIND_BOARD.to_string() && validate_hex64(pubkey).is_ok() && !dtag.is_empty() {
        Some(dtag)
    } else {
        None
    }
}

/// Fetch and reconcile the head for one board id, across all authors.
pub async fn fetch_board_head(
    client: &BuzzClient,
    board_id: &str,
) -> Result<Option<BoardSnapshot>, CliError> {
    let filter = serde_json::json!({
        "kinds": [KIND_BOARD],
        "#d": [board_id],
        "limit": 50,
    });
    let raw = client.query(&filter).await?;
    let heads = reconcile_by_dtag(parse_events(&raw)?);
    heads.first().map(BoardSnapshot::from_event).transpose()
}

/// Fetch and reconcile every card head belonging to a board (matched by the
/// `a` tag's d-tag, per the module docs).
pub async fn fetch_board_cards(
    client: &BuzzClient,
    board_id: &str,
) -> Result<Vec<CardSnapshot>, CliError> {
    let filter = serde_json::json!({
        "kinds": [KIND_BOARD_CARD],
        "limit": 500,
    });
    let raw = client.query(&filter).await?;
    let mut cards = reconcile_by_dtag(parse_events(&raw)?)
        .iter()
        .filter_map(|e| CardSnapshot::from_event(e).ok())
        .filter(|c| c.board_id == board_id)
        .collect::<Vec<_>>();
    cards.sort_by(|l, r| {
        compare_rank(
            (&l.rank, l.updated_at, &l.id),
            (&r.rank, r.updated_at, &r.id),
        )
    });
    Ok(cards)
}

/// Fetch and reconcile the head for one card id, across all authors.
pub async fn fetch_card_head(
    client: &BuzzClient,
    card_id: &str,
) -> Result<Option<CardSnapshot>, CliError> {
    let filter = serde_json::json!({
        "kinds": [KIND_BOARD_CARD],
        "#d": [card_id],
        "limit": 50,
    });
    let raw = client.query(&filter).await?;
    reconcile_by_dtag(parse_events(&raw)?)
        .into_iter()
        .next()
        .map(|e| CardSnapshot::from_event(&e))
        .transpose()
}

/// Content of a kind:30623 event. Field order matches the TS `Board`
/// interface minus `id` (`title`, `description?`, `brandScope?`, `lists`) so
/// the serialized bytes equal Desktop's `JSON.stringify` output.
#[derive(serde::Serialize)]
struct BoardContent<'a> {
    title: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<&'a str>,
    #[serde(rename = "brandScope", skip_serializing_if = "Option::is_none")]
    brand_scope: Option<&'a str>,
    lists: &'a [BoardListEntry],
}

fn tag_err(e: impl std::fmt::Display) -> CliError {
    CliError::Other(format!("failed to build tag: {e}"))
}

/// Build the unsigned kind:30623 event for `board create`, mirroring
/// `buildBoardEventTemplate`. Pure for testability.
pub fn build_board_event(
    id: &str,
    title: &str,
    description: Option<&str>,
    brand_scope: Option<&str>,
    lists: &[BoardListEntry],
) -> Result<EventBuilder, CliError> {
    if id.is_empty() || title.is_empty() {
        return Err(CliError::Usage("board id and title are required".into()));
    }
    if lists
        .iter()
        .any(|l| l.id.is_empty() || !is_valid_rank(&l.rank))
    {
        return Err(CliError::Usage(
            "every board list requires a stable id and fractional rank".into(),
        ));
    }
    let mut tags = vec![Tag::parse(["d", id]).map_err(tag_err)?];
    if let Some(brand) = brand_scope {
        tags.push(Tag::parse(["t", &format!("brand:{brand}")]).map_err(tag_err)?);
    }
    let content = serde_json::to_string(&BoardContent {
        title,
        description,
        brand_scope,
        lists,
    })
    .map_err(|e| CliError::Other(format!("failed to serialize board: {e}")))?;
    Ok(EventBuilder::new(kind_board(), content).tags(tags))
}

/// Build the unsigned kind:30624 event for `card add`, mirroring
/// `buildCardEventTemplate` (without feed-rule lineage, which the CLI never
/// sets). Pure for testability.
#[allow(clippy::too_many_arguments)]
pub fn build_card_event(
    board_address: &str,
    card_id: &str,
    title: &str,
    description: &str,
    brand: &str,
    function_area: &str,
    assignees: &[AssigneeEntry],
    execution_state: &str,
    rank: &str,
    list_id: &str,
    created_by: &str,
) -> Result<EventBuilder, CliError> {
    build_card_event_full(
        board_address,
        card_id,
        title,
        description,
        brand,
        function_area,
        assignees,
        execution_state,
        rank,
        list_id,
        created_by,
        None,
    )
}

/// `build_card_event` with an optional goal attach (`--goal`). A fresh card
/// has no comments, lineage, linked issue, or approval decision, so the
/// content is the update shape with every pass-through field absent — which
/// serializes byte-identically to the plain create shape when `parent_goal_id`
/// is `None` (optionals sit between the required fields in TS but are
/// omitted by `JSON.stringify` when undefined).
#[allow(clippy::too_many_arguments)]
pub fn build_card_event_full(
    board_address: &str,
    card_id: &str,
    title: &str,
    description: &str,
    brand: &str,
    function_area: &str,
    assignees: &[AssigneeEntry],
    execution_state: &str,
    rank: &str,
    list_id: &str,
    created_by: &str,
    parent_goal_id: Option<&str>,
) -> Result<EventBuilder, CliError> {
    if parse_board_address_dtag(board_address).is_none() {
        return Err(CliError::Usage(format!(
            "board address {board_address:?} is not a valid {KIND_BOARD} coordinate"
        )));
    }
    if card_id.is_empty()
        || title.is_empty()
        || description.is_empty()
        || list_id.is_empty()
        || !is_valid_rank(rank)
        || !FUNCTION_AREAS.contains(&function_area)
        || !CARD_EXECUTION_STATES.contains(&execution_state)
    {
        return Err(CliError::Usage(
            "card fields do not satisfy the board event contract".into(),
        ));
    }
    let mut tags = vec![
        Tag::parse(["d", card_id]).map_err(tag_err)?,
        Tag::parse(["a", board_address]).map_err(tag_err)?,
        Tag::parse(["l", list_id]).map_err(tag_err)?,
        Tag::parse(["t", &format!("brand:{brand}")]).map_err(tag_err)?,
        Tag::parse(["t", &format!("fn:{function_area}")]).map_err(tag_err)?,
    ];
    for assignee in assignees {
        // Always 4 elements; role is "" when unset (`assignee.role ?? ""`).
        tags.push(
            Tag::parse([
                "p",
                assignee.id.as_str(),
                "",
                assignee.role.as_deref().unwrap_or(""),
            ])
            .map_err(tag_err)?,
        );
    }
    tags.push(Tag::parse(["rank", rank]).map_err(tag_err)?);
    let content = serde_json::to_string(&CardUpdateContent {
        title,
        description,
        assignees,
        execution_state,
        linked_git_issue: None,
        created_by,
        feed_forward_context: None,
        comments: &[],
        parent_goal_id,
        source_lineage: None,
        approval_decision: None,
    })
    .map_err(|e| CliError::Other(format!("failed to serialize card: {e}")))?;
    Ok(EventBuilder::new(kind_board_card(), content).tags(tags))
}

/// Content of a kind:50002/50003 approval decision event. Field order
/// matches the TS `ApprovalDecision` serialization: `reason?`,
/// `policySnapshot?`. The CLI never sets `policySnapshot`.
#[derive(serde::Serialize)]
struct ApprovalDecisionContent<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a str>,
}

/// Build the unsigned kind:50002 (granted) or kind:50003 (denied) approval
/// decision event for a card, mirroring `buildApprovalDecisionEventTemplate`.
/// `card_address` must be a valid `30624:<pubkey>:<card-id>` coordinate.
pub fn build_approval_event(
    card_address: &str,
    granted: bool,
    reason: Option<&str>,
) -> Result<EventBuilder, CliError> {
    if parse_card_address_dtag(card_address).is_none() {
        return Err(CliError::Usage(format!(
            "card address {card_address:?} is not a valid {KIND_BOARD_CARD} coordinate"
        )));
    }
    let kind = if granted {
        KIND_BOARD_APPROVAL_GRANTED
    } else {
        KIND_BOARD_APPROVAL_DENIED
    };
    let tags = vec![Tag::parse(["a", card_address]).map_err(tag_err)?];
    let content = serde_json::to_string(&ApprovalDecisionContent { reason })
        .map_err(|e| CliError::Other(format!("failed to serialize approval decision: {e}")))?;
    Ok(EventBuilder::new(Kind::Custom(kind as u16), content).tags(tags))
}

/// One OKR key result as assembled from `--kr description::targetMetric::targetValue`.
/// `currentValue` is never set by the CLI (TS optional); `targetValue` is.
#[derive(Debug, Clone, PartialEq)]
pub struct GoalKeyResultInput {
    pub description: String,
    pub target_metric: String,
    pub target_value: String,
}

/// Framework block for a new goal. Exactly one variant is serialized into
/// content; the other two keys are omitted (`JSON.stringify` of `undefined`).
#[derive(Debug, Clone, PartialEq)]
pub enum GoalFrameworkBody {
    Smart {
        specific: String,
        measurable: String,
        attainable: String,
        relevant: String,
        time_bound: String,
    },
    Okr {
        objective: String,
        key_results: Vec<GoalKeyResultInput>,
    },
    Pact {
        purposeful: String,
        actionable: String,
        continuous: String,
        trackable: String,
    },
}

/// Clap flags for `board goal create`, minus `--id`/`--brand` which the
/// command validates separately. Framework-specific fields are optional at
/// parse time so a missing SMART flag is a `Usage` error, not a clap dump.
#[derive(Debug, Clone)]
pub struct GoalCreateArgs {
    pub framework: String,
    pub specific: Option<String>,
    pub measurable: Option<String>,
    pub attainable: Option<String>,
    pub relevant: Option<String>,
    pub time_bound: Option<String>,
    pub objective: Option<String>,
    pub krs: Vec<String>,
    pub purposeful: Option<String>,
    pub actionable: Option<String>,
    pub continuous: Option<String>,
    pub trackable: Option<String>,
}

/// Content of a kind:30625 event. Field order matches the TS `Goal`
/// interface minus `id` (`brandScope`, `framework`, `smart?`, `okr?`,
/// `pact?`, `status`, `proposedCards`) so the serialized bytes equal
/// Desktop's `JSON.stringify` output from `buildGoalEventTemplate`.
#[derive(serde::Serialize)]
struct GoalContent<'a> {
    #[serde(rename = "brandScope")]
    brand_scope: &'a str,
    framework: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    smart: Option<GoalSmartContent<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    okr: Option<GoalOkrContent<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pact: Option<GoalPactContent<'a>>,
    status: &'a str,
    #[serde(rename = "proposedCards")]
    proposed_cards: &'a [serde_json::Value],
}

#[derive(serde::Serialize)]
struct GoalSmartContent<'a> {
    specific: &'a str,
    measurable: &'a str,
    attainable: &'a str,
    relevant: &'a str,
    #[serde(rename = "timeBound")]
    time_bound: &'a str,
}

#[derive(serde::Serialize)]
struct GoalOkrKeyResultContent<'a> {
    description: &'a str,
    #[serde(rename = "targetMetric")]
    target_metric: &'a str,
    #[serde(rename = "currentValue", skip_serializing_if = "Option::is_none")]
    current_value: Option<&'a str>,
    #[serde(rename = "targetValue", skip_serializing_if = "Option::is_none")]
    target_value: Option<&'a str>,
}

#[derive(serde::Serialize)]
struct GoalOkrContent<'a> {
    objective: &'a str,
    #[serde(rename = "keyResults")]
    key_results: &'a [GoalOkrKeyResultContent<'a>],
}

#[derive(serde::Serialize)]
struct GoalPactContent<'a> {
    purposeful: &'a str,
    actionable: &'a str,
    continuous: &'a str,
    trackable: &'a str,
}

/// Parse `--kr description::targetMetric::targetValue`. All three parts
/// must be non-empty after trim. Extra `::` stay inside `targetValue`
/// (`splitn(3)`), so a metric value may contain the delimiter.
pub fn parse_kr(raw: &str) -> Result<GoalKeyResultInput, CliError> {
    let mut parts = raw.splitn(3, "::");
    let description = parts.next().unwrap_or("").trim();
    let target_metric = parts.next().unwrap_or("").trim();
    let target_value = parts.next().unwrap_or("").trim();
    if description.is_empty() || target_metric.is_empty() || target_value.is_empty() {
        return Err(CliError::Usage(
            "--kr must be description::targetMetric::targetValue with all three parts non-empty"
                .into(),
        ));
    }
    Ok(GoalKeyResultInput {
        description: description.to_string(),
        target_metric: target_metric.to_string(),
        target_value: target_value.to_string(),
    })
}

fn flag_is_set(value: &Option<String>) -> bool {
    value.is_some()
}

fn require_text(value: &Option<String>, flag: &str, framework: &str) -> Result<String, CliError> {
    match value {
        Some(s) if !s.trim().is_empty() => Ok(s.trim().to_string()),
        _ => Err(CliError::Usage(format!(
            "--framework {framework} requires {flag}"
        ))),
    }
}

fn reject_foreign_flags(framework: &str, flags: &[(&str, bool)]) -> Result<(), CliError> {
    let unexpected: Vec<&str> = flags
        .iter()
        .filter(|(_, present)| *present)
        .map(|(name, _)| *name)
        .collect();
    if unexpected.is_empty() {
        Ok(())
    } else {
        Err(CliError::Usage(format!(
            "--framework {framework} does not accept {}",
            unexpected.join(", ")
        )))
    }
}

/// Assemble the framework block from clap flags. Pure for testability.
pub fn assemble_goal_body(args: &GoalCreateArgs) -> Result<GoalFrameworkBody, CliError> {
    let framework = args.framework.as_str();
    if !GOAL_FRAMEWORKS.contains(&framework) {
        return Err(CliError::Usage(format!(
            "unknown framework {framework:?} — expected one of: {}",
            GOAL_FRAMEWORKS.join(", ")
        )));
    }
    match framework {
        "SMART" => {
            reject_foreign_flags(
                framework,
                &[
                    ("--objective", flag_is_set(&args.objective)),
                    ("--kr", !args.krs.is_empty()),
                    ("--purposeful", flag_is_set(&args.purposeful)),
                    ("--actionable", flag_is_set(&args.actionable)),
                    ("--continuous", flag_is_set(&args.continuous)),
                    ("--trackable", flag_is_set(&args.trackable)),
                ],
            )?;
            Ok(GoalFrameworkBody::Smart {
                specific: require_text(&args.specific, "--specific", framework)?,
                measurable: require_text(&args.measurable, "--measurable", framework)?,
                attainable: require_text(&args.attainable, "--attainable", framework)?,
                relevant: require_text(&args.relevant, "--relevant", framework)?,
                time_bound: require_text(&args.time_bound, "--time-bound", framework)?,
            })
        }
        "OKR" => {
            reject_foreign_flags(
                framework,
                &[
                    ("--specific", flag_is_set(&args.specific)),
                    ("--measurable", flag_is_set(&args.measurable)),
                    ("--attainable", flag_is_set(&args.attainable)),
                    ("--relevant", flag_is_set(&args.relevant)),
                    ("--time-bound", flag_is_set(&args.time_bound)),
                    ("--purposeful", flag_is_set(&args.purposeful)),
                    ("--actionable", flag_is_set(&args.actionable)),
                    ("--continuous", flag_is_set(&args.continuous)),
                    ("--trackable", flag_is_set(&args.trackable)),
                ],
            )?;
            if args.krs.is_empty() {
                return Err(CliError::Usage(
                    "--framework OKR requires --kr description::targetMetric::targetValue (repeatable)"
                        .into(),
                ));
            }
            let key_results = args
                .krs
                .iter()
                .map(|raw| parse_kr(raw))
                .collect::<Result<Vec<_>, _>>()?;
            Ok(GoalFrameworkBody::Okr {
                objective: require_text(&args.objective, "--objective", framework)?,
                key_results,
            })
        }
        "PACT" => {
            reject_foreign_flags(
                framework,
                &[
                    ("--specific", flag_is_set(&args.specific)),
                    ("--measurable", flag_is_set(&args.measurable)),
                    ("--attainable", flag_is_set(&args.attainable)),
                    ("--relevant", flag_is_set(&args.relevant)),
                    ("--time-bound", flag_is_set(&args.time_bound)),
                    ("--objective", flag_is_set(&args.objective)),
                    ("--kr", !args.krs.is_empty()),
                ],
            )?;
            Ok(GoalFrameworkBody::Pact {
                purposeful: require_text(&args.purposeful, "--purposeful", framework)?,
                actionable: require_text(&args.actionable, "--actionable", framework)?,
                continuous: require_text(&args.continuous, "--continuous", framework)?,
                trackable: require_text(&args.trackable, "--trackable", framework)?,
            })
        }
        _ => unreachable!("GOAL_FRAMEWORKS membership checked above"),
    }
}

/// Build the unsigned kind:30625 event for `board goal create`, mirroring
/// `buildGoalEventTemplate`: id lifts to the `d` tag, everything else
/// serializes into content. Pure for testability. Do not add a field here
/// that the TS `Goal` interface does not carry.
pub fn build_goal_event(
    id: &str,
    brand_scope: &str,
    body: &GoalFrameworkBody,
) -> Result<EventBuilder, CliError> {
    if id.is_empty() {
        return Err(CliError::Usage("goal id is required".into()));
    }
    if brand_scope.is_empty() {
        return Err(CliError::Usage("goal --brand is required".into()));
    }
    let tags = vec![Tag::parse(["d", id]).map_err(tag_err)?];
    let content = match body {
        GoalFrameworkBody::Smart {
            specific,
            measurable,
            attainable,
            relevant,
            time_bound,
        } => serde_json::to_string(&GoalContent {
            brand_scope,
            framework: "SMART",
            smart: Some(GoalSmartContent {
                specific,
                measurable,
                attainable,
                relevant,
                time_bound,
            }),
            okr: None,
            pact: None,
            status: "draft",
            proposed_cards: &[],
        }),
        GoalFrameworkBody::Okr {
            objective,
            key_results,
        } => {
            let krs: Vec<GoalOkrKeyResultContent<'_>> = key_results
                .iter()
                .map(|kr| GoalOkrKeyResultContent {
                    description: &kr.description,
                    target_metric: &kr.target_metric,
                    current_value: None,
                    target_value: Some(kr.target_value.as_str()),
                })
                .collect();
            serde_json::to_string(&GoalContent {
                brand_scope,
                framework: "OKR",
                smart: None,
                okr: Some(GoalOkrContent {
                    objective,
                    key_results: &krs,
                }),
                pact: None,
                status: "draft",
                proposed_cards: &[],
            })
        }
        GoalFrameworkBody::Pact {
            purposeful,
            actionable,
            continuous,
            trackable,
        } => serde_json::to_string(&GoalContent {
            brand_scope,
            framework: "PACT",
            smart: None,
            okr: None,
            pact: Some(GoalPactContent {
                purposeful,
                actionable,
                continuous,
                trackable,
            }),
            status: "draft",
            proposed_cards: &[],
        }),
    }
    .map_err(|e| CliError::Other(format!("failed to serialize goal: {e}")))?;
    Ok(EventBuilder::new(kind_board_goal(), content).tags(tags))
}

/// Extract the d-tag from a `30624:<pubkey>:<dtag>` coordinate, mirroring
/// `parseAddress(value, KIND_BOARD_CARD)`.
fn parse_card_address_dtag(address: &str) -> Option<&str> {
    let mut parts = address.splitn(3, ':');
    let kind = parts.next()?;
    let pubkey = parts.next()?;
    let dtag = parts.next()?;
    if kind == KIND_BOARD_CARD.to_string() && validate_hex64(pubkey).is_ok() && !dtag.is_empty() {
        Some(dtag)
    } else {
        None
    }
}

/// Fields `card set` / `card move` can change. `None` means "keep the head's
/// value"; `Some` replaces it — an explicitly empty assignee list is a real
/// change (unassign-everyone), not a no-op.
#[derive(Debug, Default)]
pub struct CardChanges {
    pub title: Option<String>,
    pub description: Option<String>,
    pub execution_state: Option<String>,
    pub list_id: Option<String>,
    pub rank: Option<String>,
    pub assignees: Option<Vec<AssigneeEntry>>,
    pub parent_goal_id: Option<String>,
}

impl CardChanges {
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.description.is_none()
            && self.execution_state.is_none()
            && self.list_id.is_none()
            && self.rank.is_none()
            && self.assignees.is_none()
            && self.parent_goal_id.is_none()
    }
}

/// Content of a kind:30624 update event — what Desktop's `updateCard`
/// produces by spreading the *parsed* card (`{ ...current, ...changes }`)
/// and dropping the indexed fields in `buildCardEventTemplate`. Field order
/// is `parseCard`'s re-insertion order, so the serialized bytes equal
/// Desktop's `JSON.stringify` output. Pure for testability.
#[derive(serde::Serialize)]
struct CardUpdateContent<'a> {
    title: &'a str,
    description: &'a str,
    assignees: &'a [AssigneeEntry],
    #[serde(rename = "executionState")]
    execution_state: &'a str,
    #[serde(rename = "linkedGitIssue", skip_serializing_if = "Option::is_none")]
    linked_git_issue: Option<&'a str>,
    #[serde(rename = "createdBy")]
    created_by: &'a str,
    #[serde(rename = "feedForwardContext", skip_serializing_if = "Option::is_none")]
    feed_forward_context: Option<&'a serde_json::Value>,
    comments: &'a [CardComment],
    #[serde(rename = "parentGoalId", skip_serializing_if = "Option::is_none")]
    parent_goal_id: Option<&'a str>,
    #[serde(rename = "sourceLineage", skip_serializing_if = "Option::is_none")]
    source_lineage: Option<&'a serde_json::Value>,
    #[serde(rename = "approvalDecision", skip_serializing_if = "Option::is_none")]
    approval_decision: Option<&'a serde_json::Value>,
}

/// Build the unsigned kind:30624 event for `card set` / `card move`,
/// mirroring `updateCard` → `buildCardEventTemplate`: the changes are
/// applied to the reconciled head and every untouched field is carried over
/// — comments, createdBy, linked issue, feed-rule lineage, approval state.
/// Pure for testability; the caller supplies the fetched head.
pub fn build_card_update_event(
    board_address: &str,
    head: &CardSnapshot,
    changes: &CardChanges,
) -> Result<EventBuilder, CliError> {
    if parse_board_address_dtag(board_address).is_none() {
        return Err(CliError::Usage(format!(
            "board address {board_address:?} is not a valid {KIND_BOARD} coordinate"
        )));
    }
    let title = changes.title.as_deref().unwrap_or(&head.title);
    let description = changes.description.as_deref().unwrap_or(&head.description);
    let execution_state = changes
        .execution_state
        .as_deref()
        .unwrap_or(&head.execution_state);
    let list_id = changes.list_id.as_deref().unwrap_or(&head.list_id);
    let rank = changes.rank.as_deref().unwrap_or(&head.rank);
    let assignees = changes.assignees.as_ref().unwrap_or(&head.assignees);
    let parent_goal_id = changes
        .parent_goal_id
        .as_deref()
        .or(head.parent_goal_id.as_deref());
    if head.id.is_empty()
        || title.is_empty()
        || description.is_empty()
        || list_id.is_empty()
        || !is_valid_rank(rank)
        || !FUNCTION_AREAS.contains(&head.function_area.as_str())
        || !CARD_EXECUTION_STATES.contains(&execution_state)
        || Some(head.board_id.as_str()) != parse_board_address_dtag(board_address)
    {
        return Err(CliError::Usage(
            "card fields do not satisfy the board event contract".into(),
        ));
    }
    let mut tags = vec![
        Tag::parse(["d", head.id.as_str()]).map_err(tag_err)?,
        Tag::parse(["a", board_address]).map_err(tag_err)?,
        Tag::parse(["l", list_id]).map_err(tag_err)?,
        Tag::parse(["t", &format!("brand:{}", head.brand)]).map_err(tag_err)?,
        Tag::parse(["t", &format!("fn:{}", head.function_area)]).map_err(tag_err)?,
    ];
    for assignee in assignees {
        // Always 4 elements; role is "" when unset (`assignee.role ?? ""`).
        tags.push(
            Tag::parse([
                "p",
                assignee.id.as_str(),
                "",
                assignee.role.as_deref().unwrap_or(""),
            ])
            .map_err(tag_err)?,
        );
    }
    tags.push(Tag::parse(["rank", rank]).map_err(tag_err)?);
    // Feed-rule lineage is re-emitted from the head. Like
    // `buildCardEventTemplate`, a lineage carrying only one of
    // ruleId/triggerEventId is a hard error — writing it would produce a
    // card the Desktop parser drops.
    if let Some(lineage) = &head.source_lineage {
        let rule_id = lineage.get("ruleId").and_then(|v| v.as_str());
        let trigger_id = lineage.get("triggerEventId").and_then(|v| v.as_str());
        match (rule_id, trigger_id) {
            (Some(rule_id), Some(trigger_id)) => {
                tags.push(Tag::parse(["feedRule", rule_id, trigger_id]).map_err(tag_err)?);
                tags.push(Tag::parse(["e", trigger_id]).map_err(tag_err)?);
            }
            _ => {
                return Err(CliError::Other(
                    "feed-rule lineage requires both a rule and trigger event id".into(),
                ));
            }
        }
    }
    let content = serde_json::to_string(&CardUpdateContent {
        title,
        description,
        assignees,
        execution_state,
        linked_git_issue: head.linked_git_issue.as_deref(),
        created_by: &head.created_by,
        feed_forward_context: head.feed_forward_context.as_ref(),
        comments: &head.comments,
        parent_goal_id,
        source_lineage: head.source_lineage.as_ref(),
        approval_decision: head.approval_decision.as_ref(),
    })
    .map_err(|e| CliError::Other(format!("failed to serialize card update: {e}")))?;
    Ok(EventBuilder::new(kind_board_card(), content).tags(tags))
}

/// Where a moved card lands in its target column.
#[derive(Debug)]
pub enum MovePosition {
    Top,
    Bottom,
    Before(String),
    After(String),
}

/// Compute the rank for a card entering `column` (cards currently in the
/// target list, excluding the moving card) at `position`. Anchoring off a
/// card that is not in the column is an error, not a silent append.
pub fn compute_move_rank(
    column: &[CardSnapshot],
    position: &MovePosition,
) -> Result<String, CliError> {
    let mut ordered: Vec<&CardSnapshot> = column.iter().collect();
    ordered.sort_by(|l, r| {
        compare_rank(
            (&l.rank, l.updated_at, &l.id),
            (&r.rank, r.updated_at, &r.id),
        )
    });
    let at = |id: &str| -> Result<usize, CliError> {
        ordered
            .iter()
            .position(|c| c.id == id)
            .ok_or_else(|| CliError::Usage(format!("no card {id:?} in the target column")))
    };
    let (lower, upper) = match position {
        MovePosition::Top => (None, ordered.first().map(|c| c.rank.as_str())),
        MovePosition::Bottom => (ordered.last().map(|c| c.rank.as_str()), None),
        MovePosition::Before(id) => {
            let i = at(id)?;
            let lower = i.checked_sub(1).map(|j| ordered[j].rank.as_str());
            (lower, Some(ordered[i].rank.as_str()))
        }
        MovePosition::After(id) => {
            let i = at(id)?;
            let upper = ordered.get(i + 1).map(|c| c.rank.as_str());
            (Some(ordered[i].rank.as_str()), upper)
        }
    };
    rank_between(lower, upper)
}

/// Parse a `--assign <role> <pubkey>` pair. CLI-created assignees are typed
/// `agent`, same as `--assignee` on `card add`.
fn parse_assign_pair(role: &str, id: &str) -> Result<AssigneeEntry, CliError> {
    if !ASSIGNEE_ROLES.contains(&role) {
        return Err(CliError::Usage(format!(
            "unknown assignee role {role:?} — expected one of: {}",
            ASSIGNEE_ROLES.join(", ")
        )));
    }
    validate_hex64(id)
        .map_err(|_| CliError::Usage(format!("assignee id {id:?} is not a 64-hex pubkey")))?;
    Ok(AssigneeEntry {
        kind: "agent".to_owned(),
        id: id.to_owned(),
        role: Some(role.to_owned()),
    })
}

/// Upsert an assignee by id: re-assigning replaces the role in place, a new
/// id appends. Order is preserved so re-emitted `p` tags stay stable.
fn apply_assign(existing: &[AssigneeEntry], entry: AssigneeEntry) -> Vec<AssigneeEntry> {
    let mut out = existing.to_vec();
    match out.iter_mut().find(|a| a.id == entry.id) {
        Some(slot) => slot.role = entry.role,
        None => out.push(entry),
    }
    out
}

/// Remove an assignee by id. An unknown id is a hard error — a typo silently
/// passing would leave the caller believing someone came off the card.
fn apply_unassign(existing: &[AssigneeEntry], id: &str) -> Result<Vec<AssigneeEntry>, CliError> {
    if !existing.iter().any(|a| a.id == id) {
        return Err(CliError::Usage(format!(
            "card has no assignee {id:?} to remove"
        )));
    }
    Ok(existing.iter().filter(|a| a.id != id).cloned().collect())
}

/// Parsed view of a kind:30625 goal head. `board goal create` refuses an
/// existing id by this snapshot; `card add/set --goal` uses the same fetch.
pub struct GoalSnapshot {
    pub id: String,
    pub brand_scope: String,
}

impl GoalSnapshot {
    /// Parse a kind:30625 event, strict where `parseGoal` is: d tag present,
    /// brandScope non-empty, framework and status in their enums,
    /// proposedCards an array.
    pub fn from_event(event: &Event) -> Result<Self, CliError> {
        if event.kind != kind_board_goal() {
            return Err(CliError::Other(format!(
                "expected kind:{KIND_BOARD_GOAL}, got {}",
                event.kind.as_u16()
            )));
        }
        let id = unique_d_tag(event)
            .ok_or_else(|| CliError::Other("goal event lacks a unique d tag".into()))?;
        let content: serde_json::Value = serde_json::from_str(&event.content)
            .map_err(|e| CliError::Other(format!("goal content is not JSON: {e}")))?;
        let required = |key: &str| -> Result<String, CliError> {
            content
                .get(key)
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(str::to_owned)
                .ok_or_else(|| CliError::Other(format!("goal content lacks {key}")))
        };
        let framework = required("framework")?;
        if !GOAL_FRAMEWORKS.contains(&framework.as_str()) {
            return Err(CliError::Other(format!(
                "goal event has unknown framework {framework:?}"
            )));
        }
        let status = required("status")?;
        if !GOAL_STATUSES.contains(&status.as_str()) {
            return Err(CliError::Other(format!(
                "goal event has unknown status {status:?}"
            )));
        }
        if !content.get("proposedCards").is_some_and(|v| v.is_array()) {
            return Err(CliError::Other(
                "goal content lacks a proposedCards array".into(),
            ));
        }
        Ok(Self {
            id: id.to_owned(),
            brand_scope: required("brandScope")?,
        })
    }
}

/// Fetch and reconcile the head for one goal id, across all authors.
pub async fn fetch_goal_head(
    client: &BuzzClient,
    goal_id: &str,
) -> Result<Option<GoalSnapshot>, CliError> {
    let filter = serde_json::json!({
        "kinds": [KIND_BOARD_GOAL],
        "#d": [goal_id],
        "limit": 50,
    });
    let raw = client.query(&filter).await?;
    reconcile_by_dtag(parse_events(&raw)?)
        .into_iter()
        .next()
        .map(|e| GoalSnapshot::from_event(&e))
        .transpose()
}

/// Build the default five columns the way Desktop's `buildDefaultLists`
/// does: UUID v4 ids, ranks from chained `rankBetween(last, null)`.
pub fn build_default_lists() -> Result<Vec<BoardListEntry>, CliError> {
    lists_from_titles(DEFAULT_LIST_TITLES.iter().map(|s| s.to_string()))
}

/// Build columns from explicit titles (`--lists "A,B,C"`).
fn lists_from_titles(
    titles: impl Iterator<Item = String>,
) -> Result<Vec<BoardListEntry>, CliError> {
    let mut lists = Vec::new();
    let mut rank: Option<String> = None;
    for title in titles {
        if title.is_empty() {
            return Err(CliError::Usage("list titles cannot be empty".into()));
        }
        rank = Some(rank_between(rank.as_deref(), None)?);
        lists.push(BoardListEntry {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            rank: rank.clone().expect("rank just set"),
        });
    }
    if lists.is_empty() {
        return Err(CliError::Usage("a board needs at least one list".into()));
    }
    Ok(lists)
}

/// Parse a `--lists` CSV into titles. Commas separate; surrounding
/// whitespace is trimmed; empty entries are an error (a stray comma would
/// otherwise birth an untitled column the CLI can never fix — lists are
/// immutable in v1).
fn parse_lists_csv(csv: &str) -> Result<Vec<String>, CliError> {
    let titles: Vec<String> = csv.split(',').map(str::trim).map(str::to_owned).collect();
    if titles.iter().any(|t| t.is_empty()) {
        return Err(CliError::Usage(format!(
            "--lists {csv:?} contains an empty title"
        )));
    }
    Ok(titles)
}

/// Parse one `--assignee <hex>[:role]` flag value. CLI-created assignees
/// are typed `agent` — the CLI has no way to distinguish, and seeds file
/// unassigned; use Desktop to attach a human.
fn parse_assignee(raw: &str) -> Result<AssigneeEntry, CliError> {
    let (id, role) = match raw.split_once(':') {
        Some((id, role)) => {
            if !ASSIGNEE_ROLES.contains(&role) {
                return Err(CliError::Usage(format!(
                    "unknown assignee role {role:?} — expected one of: {}",
                    ASSIGNEE_ROLES.join(", ")
                )));
            }
            (id, Some(role.to_owned()))
        }
        None => (raw, None),
    };
    validate_hex64(id)
        .map_err(|_| CliError::Usage(format!("assignee id {id:?} is not a 64-hex pubkey")))?;
    Ok(AssigneeEntry {
        kind: "agent".to_owned(),
        id: id.to_owned(),
        role,
    })
}

/// Resolve `--list` (id or exact title) against a board head. Defaults to
/// the first column by rank order.
fn resolve_list<'a>(
    board: &'a BoardSnapshot,
    list: Option<&str>,
) -> Result<&'a BoardListEntry, CliError> {
    let mut ordered: Vec<&BoardListEntry> = board.lists.iter().collect();
    ordered.sort_by(|l, r| compare_rank((&l.rank, 0, &l.id), (&r.rank, 0, &r.id)));
    match list {
        None => ordered
            .first()
            .copied()
            .ok_or_else(|| CliError::Other("board has no lists".into())),
        Some(needle) => ordered
            .iter()
            .find(|l| l.id == needle || l.title == needle)
            .copied()
            .ok_or_else(|| {
                let available = ordered
                    .iter()
                    .map(|l| format!("{} ({})", l.title, l.id))
                    .collect::<Vec<_>>()
                    .join(", ");
                CliError::Usage(format!(
                    "no list {needle:?} on board {:?}; available: {available}",
                    board.id
                ))
            }),
    }
}

/// Sign, submit, and classify the relay response. Returns the signed event
/// on an accepted write; maps rejection/duplicate to the right error.
async fn sign_and_submit(
    client: &BuzzClient,
    builder: EventBuilder,
    conflict_msg: &str,
) -> Result<Event, CliError> {
    let event = client.sign_event(builder)?;
    let raw = client.submit_event(event.clone()).await?;
    parse_write_response(&raw, conflict_msg)?;
    Ok(event)
}

pub async fn cmd_ls(
    client: &BuzzClient,
    brand: Option<&str>,
    limit: Option<u32>,
) -> Result<(), CliError> {
    let mut filter = serde_json::json!({
        "kinds": [KIND_BOARD],
        "limit": limit.unwrap_or(50).min(200),
    });
    if let Some(brand) = brand {
        let brand = validate_brand(brand)?;
        filter["#t"] = serde_json::json!([format!("brand:{brand}")]);
    }
    let raw = client.query(&filter).await?;
    let mut boards = reconcile_by_dtag(parse_events(&raw)?)
        .iter()
        .filter_map(|e| BoardSnapshot::from_event(e).ok())
        .collect::<Vec<_>>();
    boards.sort_by_key(|b| std::cmp::Reverse(b.updated_at));
    let out: Vec<serde_json::Value> = boards
        .iter()
        .map(|b| {
            serde_json::json!({
                "id": b.id,
                "title": b.title,
                "description": b.description,
                "brandScope": b.brand_scope,
                "owner": b.owner,
                "coordinate": b.coordinate(),
                "eventId": b.event_id,
                "lists": b.lists.len(),
                "updatedAt": b.updated_at,
            })
        })
        .collect();
    println!(
        "{}",
        serde_json::to_string_pretty(&out)
            .map_err(|e| CliError::Other(format!("failed to serialize boards: {e}")))?
    );
    Ok(())
}

/// The label for a pubkey that has no kind:0 profile (or whose profile carries
/// no usable name).
///
/// This is the Rust mirror of `truncatePubkey` in
/// `desktop/src/shared/lib/pubkey.ts` — `abcd1234\u{2026}wxyz`, first 8 and last 4 —
/// and must stay identical to it. That module is the one canonical compact
/// display form precisely so surfaces cannot disagree about how a key reads,
/// and the `check-pubkey-truncation` guard that enforces it only scans
/// `.ts`/`.tsx`, so Rust is outside its reach and has to hold the line by hand.
///
/// The suffix is not decoration: a truncated pubkey is a recognition aid and
/// never an identity proof, and a bare 8-character prefix is the cheapest part
/// to vanity-grind. Keeping the trailing characters makes a look-alike key
/// meaningfully harder to pass off.
fn pubkey_fallback_label(pubkey: &str) -> String {
    let chars: Vec<char> = pubkey.chars().collect();
    if chars.len() <= 12 {
        return pubkey.to_string();
    }
    let prefix: String = chars[..8].iter().collect();
    let suffix: String = chars[chars.len() - 4..].iter().collect();
    format!("{prefix}\u{2026}{suffix}")
}

/// Hex pubkeys are case-insensitive but compared as strings. Mirrors
/// `normalizePubkey` in `desktop/src/shared/lib/pubkey.ts`.
fn normalize_pubkey(pubkey: &str) -> String {
    pubkey.trim().to_lowercase()
}

/// Resolve pubkeys to human labels from their kind:0 metadata.
///
/// Resolution order is `display_name` -> `name` -> 8-character prefix, which is
/// the order `users.rs` already uses for `buzz users get` and that Desktop's
/// `resolveUserLabel` uses for every other surface. Agent keys carry
/// `display_name` (the handle, e.g. `TUN`); `name` is honoured as a fallback so
/// a NIP-01 profile that only sets the username still resolves.
///
/// Profile lookup is best-effort by design: `board get` must still print the
/// board when the relay refuses or the query fails, so every unresolved key
/// simply falls back to its prefix rather than failing the command.
async fn resolve_pubkey_labels(
    client: &BuzzClient,
    pubkeys: &[String],
) -> std::collections::HashMap<String, String> {
    // Keyed by normalized pubkey throughout: hex is case-insensitive, but the
    // relay echoes lowercase while a card may store any case, so looking up the
    // raw id would miss its own freshly-inserted entry.
    let mut labels: std::collections::HashMap<String, String> = pubkeys
        .iter()
        .map(|pk| (normalize_pubkey(pk), pubkey_fallback_label(pk)))
        .collect();
    if pubkeys.is_empty() {
        return labels;
    }

    let filter = serde_json::json!({
        "kinds": [0],
        "authors": pubkeys,
        "limit": pubkeys.len(),
    });
    let Ok(raw) = client.query(&filter).await else {
        return labels;
    };
    let events: Vec<serde_json::Value> = serde_json::from_str(&raw).unwrap_or_default();
    for event in &events {
        let Some(pubkey) = event.get("pubkey").and_then(|v| v.as_str()) else {
            continue;
        };
        let Some(content) = event.get("content").and_then(|v| v.as_str()) else {
            continue;
        };
        let Ok(profile) = serde_json::from_str::<serde_json::Value>(content) else {
            continue;
        };
        if let Some(label) = profile_label(&profile) {
            labels.insert(normalize_pubkey(pubkey), label);
        }
    }
    labels
}

/// `display_name` then `name`, each trimmed; `None` when neither is usable.
fn profile_label(profile: &serde_json::Value) -> Option<String> {
    ["display_name", "name"]
        .iter()
        .filter_map(|key| profile.get(*key))
        .filter_map(|value| value.as_str())
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(str::to_string)
}

/// Render one assignee for display: the stored `{type,id,role}` plus a resolved
/// `name`. Built here rather than on `AssigneeEntry` on purpose — that struct is
/// serialized straight into card event content, which must stay byte-identical
/// to the TypeScript `Assignee` interface, so it must never grow a field.
fn assignee_display(
    assignee: &AssigneeEntry,
    labels: &std::collections::HashMap<String, String>,
) -> serde_json::Value {
    let name = labels
        .get(&normalize_pubkey(&assignee.id))
        .cloned()
        .unwrap_or_else(|| pubkey_fallback_label(&assignee.id));
    serde_json::json!({
        "type": assignee.kind,
        "id": assignee.id,
        "role": assignee.role,
        "name": name,
    })
}

pub async fn cmd_get(client: &BuzzClient, board_id: &str) -> Result<(), CliError> {
    let board = fetch_board_head(client, board_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("board not found: {board_id}")))?;
    let cards = fetch_board_cards(client, &board.id).await?;

    // One batched kind:0 lookup for every assignee on the board, rather than a
    // query per card — a full board is dozens of cards over a handful of keys.
    let mut assignee_pubkeys: Vec<String> = cards
        .iter()
        .flat_map(|c| c.assignees.iter().map(|a| a.id.clone()))
        .collect();
    assignee_pubkeys.sort();
    assignee_pubkeys.dedup();
    let labels = resolve_pubkey_labels(client, &assignee_pubkeys).await;

    let mut ordered_lists: Vec<&BoardListEntry> = board.lists.iter().collect();
    ordered_lists.sort_by(|l, r| compare_rank((&l.rank, 0, &l.id), (&r.rank, 0, &r.id)));
    let columns: Vec<serde_json::Value> = ordered_lists
        .iter()
        .map(|list| {
            let column_cards: Vec<serde_json::Value> = cards
                .iter()
                .filter(|c| c.list_id == list.id)
                .map(|c| {
                    serde_json::json!({
                        "id": c.id,
                        "title": c.title,
                        "description": c.description,
                        "brand": c.brand,
                        "functionArea": c.function_area,
                        "executionState": c.execution_state,
                        "rank": c.rank,
                        "assignees": c.assignees
                            .iter()
                            .map(|a| assignee_display(a, &labels))
                            .collect::<Vec<_>>(),
                        "createdBy": c.created_by,
                        "owner": c.owner,
                        "coordinate": c.coordinate(),
                        "eventId": c.event_id,
                        "updatedAt": c.updated_at,
                    })
                })
                .collect();
            serde_json::json!({
                "id": list.id,
                "title": list.title,
                "rank": list.rank,
                "cards": column_cards,
            })
        })
        .collect();
    let out = serde_json::json!({
        "board": {
            "id": board.id,
            "title": board.title,
            "description": board.description,
            "brandScope": board.brand_scope,
            "owner": board.owner,
            "coordinate": board.coordinate(),
            "eventId": board.event_id,
            "updatedAt": board.updated_at,
        },
        "columns": columns,
    });
    println!(
        "{}",
        serde_json::to_string_pretty(&out)
            .map_err(|e| CliError::Other(format!("failed to serialize board: {e}")))?
    );
    Ok(())
}

pub async fn cmd_create(
    client: &BuzzClient,
    id: &str,
    title: &str,
    brand: Option<&str>,
    description: Option<&str>,
    lists_csv: Option<&str>,
) -> Result<(), CliError> {
    let id = crate::commands::notes::parse_slug(id)?;
    if title.is_empty() {
        return Err(CliError::Usage("--title cannot be empty".into()));
    }
    let brand = brand.map(validate_brand).transpose()?;
    let lists = match lists_csv {
        Some(csv) => lists_from_titles(parse_lists_csv(csv)?.into_iter())?,
        None => build_default_lists()?,
    };

    // Read-before-write: a second board with this id (any author) would fork
    // the reconciled head — boards reconcile by d-tag, so creating over an
    // existing id silently overwrites someone else's board.
    if fetch_board_head(client, &id).await?.is_some() {
        return Err(CliError::Conflict(format!(
            "board {id:?} already exists; boards reconcile by id across authors, \
             so creating it again would overwrite the shared head"
        )));
    }

    let builder = build_board_event(&id, title, description, brand, &lists)?;
    let event = sign_and_submit(client, builder, "relay reported board event as duplicate").await?;
    println!("event_id   {}", event.id.to_hex());
    println!("coordinate {KIND_BOARD}:{}:{id}", event.pubkey.to_hex());
    println!("id         {id}");
    println!("title      {title}");
    Ok(())
}

pub async fn cmd_goal_create(
    client: &BuzzClient,
    id: &str,
    brand: &str,
    args: &GoalCreateArgs,
) -> Result<(), CliError> {
    let id = crate::commands::notes::parse_slug(id)?;
    let brand = validate_brand(brand)?;
    let body = assemble_goal_body(args)?;

    // parentGoalId is a d-tag, so a second writer of the same id would fork
    // the attach. Refuse any existing head, matching `board create`.
    if let Some(existing) = fetch_goal_head(client, &id).await? {
        return Err(CliError::Conflict(format!(
            "goal {:?} already exists (brandScope {}); goals are addressed by d-tag, \
             so creating it again would overwrite the shared head",
            existing.id, existing.brand_scope
        )));
    }

    let builder = build_goal_event(&id, brand, &body)?;
    let event = sign_and_submit(client, builder, "relay reported goal event as duplicate").await?;
    println!("event_id   {}", event.id.to_hex());
    println!(
        "coordinate {KIND_BOARD_GOAL}:{}:{id}",
        event.pubkey.to_hex()
    );
    println!("id         {id}");
    println!("brand      {brand}");
    println!("framework  {}", args.framework);
    println!("status     draft");
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn cmd_card_add(
    client: &BuzzClient,
    board_id: &str,
    title: &str,
    description: &str,
    brand: &str,
    function_area: &str,
    list: Option<&str>,
    assignees: &[String],
    goal: Option<&str>,
) -> Result<(), CliError> {
    if title.is_empty() {
        return Err(CliError::Usage("--title cannot be empty".into()));
    }
    if description.is_empty() {
        return Err(CliError::Usage("--description cannot be empty".into()));
    }
    let brand = validate_brand(brand)?;
    let function_area = validate_function_area(function_area)?;
    let assignees = assignees
        .iter()
        .map(|a| parse_assignee(a))
        .collect::<Result<Vec<_>, _>>()?;
    // A dangling parentGoalId is invisible-broken the same way a brand typo
    // is — validate the goal exists at the write boundary.
    if let Some(goal_id) = goal {
        fetch_goal_head(client, goal_id)
            .await?
            .ok_or_else(|| CliError::NotFound(format!("goal not found: {goal_id}")))?;
    }

    // Read-before-write: the board head (reconciled across authors) supplies
    // the `a` coordinate and the list set; the card ranks off the reconciled
    // column head, never CLI-supplied state.
    let board = fetch_board_head(client, board_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("board not found: {board_id}")))?;
    let list = resolve_list(&board, list)?;
    let cards = fetch_board_cards(client, &board.id).await?;
    let last_rank = cards
        .iter()
        .filter(|c| c.list_id == list.id)
        .map(|c| c.rank.as_str())
        .next_back();
    let rank = rank_between(last_rank, None)?;

    let card_id = uuid::Uuid::new_v4().to_string();
    let board_address = board.coordinate();
    let me = client.keys().public_key().to_hex();
    let builder = build_card_event_full(
        &board_address,
        &card_id,
        title,
        description,
        brand,
        function_area,
        &assignees,
        "idle",
        &rank,
        &list.id,
        &me,
        goal,
    )?;
    let event = sign_and_submit(client, builder, "relay reported card event as duplicate").await?;
    println!("event_id   {}", event.id.to_hex());
    println!(
        "coordinate {KIND_BOARD_CARD}:{}:{card_id}",
        event.pubkey.to_hex()
    );
    println!("board      {board_address}");
    println!("list       {} ({})", list.title, list.id);
    println!("rank       {rank}");
    if let Some(goal_id) = goal {
        println!("goal       {goal_id}");
    }
    Ok(())
}

async fn cmd_approval(
    client: &BuzzClient,
    board_id: &str,
    card_id: &str,
    granted: bool,
    reason: Option<&str>,
) -> Result<(), CliError> {
    let verb = if granted { "approve" } else { "deny" };

    // Verify the board exists — the CLI commands by board id, and a decision
    // on a non-existent board is an easy mistake to catch early.
    let _board = fetch_board_head(client, board_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("board not found: {board_id}")))?;

    // Verify the card exists and belongs to the requested board. Approval
    // events anchor by full card address, so a typo in board/card must fail
    // here rather than writing an orphan decision.
    let card = fetch_card_head(client, card_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("card not found: {card_id}")))?;
    if card.board_id != board_id {
        return Err(CliError::Usage(format!(
            "card {card_id:?} belongs to board {:?}, not {board_id:?}",
            card.board_id
        )));
    }

    let card_address = card.coordinate();
    let builder = build_approval_event(&card_address, granted, reason)?;
    let event = sign_and_submit(
        client,
        builder,
        "relay reported approval decision as duplicate",
    )
    .await?;
    println!("event_id   {}", event.id.to_hex());
    println!("card       {card_address}");
    println!("decision   {verb}");
    if let Some(reason) = reason {
        println!("reason     {reason}");
    }
    Ok(())
}

pub async fn cmd_card_approve(
    client: &BuzzClient,
    board_id: &str,
    card_id: &str,
    reason: Option<&str>,
) -> Result<(), CliError> {
    cmd_approval(client, board_id, card_id, true, reason).await
}

pub async fn cmd_card_deny(
    client: &BuzzClient,
    board_id: &str,
    card_id: &str,
    reason: Option<&str>,
) -> Result<(), CliError> {
    cmd_approval(client, board_id, card_id, false, reason).await
}

/// Fetch the board head and the card head, and verify the card belongs to
/// the board — the shared read-before-write prelude for the update verbs.
async fn fetch_card_for_update(
    client: &BuzzClient,
    board_id: &str,
    card_id: &str,
) -> Result<(BoardSnapshot, CardSnapshot), CliError> {
    let board = fetch_board_head(client, board_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("board not found: {board_id}")))?;
    let card = fetch_card_head(client, card_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("card not found: {card_id}")))?;
    if card.board_id != board.id {
        return Err(CliError::Usage(format!(
            "card {card_id:?} belongs to board {:?}, not {board_id:?}",
            card.board_id
        )));
    }
    Ok((board, card))
}

#[allow(clippy::too_many_arguments)]
pub async fn cmd_card_set(
    client: &BuzzClient,
    board_id: &str,
    card_id: &str,
    title: Option<&str>,
    description: Option<&str>,
    execution_state: Option<&str>,
    assigns: &[String],
    unassigns: &[String],
    goal: Option<&str>,
) -> Result<(), CliError> {
    if let Some(title) = title {
        if title.is_empty() {
            return Err(CliError::Usage("--title cannot be empty".into()));
        }
    }
    if let Some(description) = description {
        if description.is_empty() {
            return Err(CliError::Usage("--description cannot be empty".into()));
        }
    }
    let execution_state = execution_state.map(validate_execution_state).transpose()?;
    if let Some(goal_id) = goal {
        fetch_goal_head(client, goal_id)
            .await?
            .ok_or_else(|| CliError::NotFound(format!("goal not found: {goal_id}")))?;
    }

    // Read-before-write: mutate the reconciled head (across all authors),
    // never CLI-supplied state, so comments/lineage/approval survive.
    let (board, card) = fetch_card_for_update(client, board_id, card_id).await?;

    let mut changes = CardChanges {
        title: title.map(str::to_owned),
        description: description.map(str::to_owned),
        execution_state: execution_state.map(str::to_owned),
        parent_goal_id: goal.map(str::to_owned),
        ..Default::default()
    };
    if !assigns.is_empty() || !unassigns.is_empty() {
        let mut assignees = card.assignees.clone();
        for pair in assigns.chunks_exact(2) {
            assignees = apply_assign(&assignees, parse_assign_pair(&pair[0], &pair[1])?);
        }
        for id in unassigns {
            assignees = apply_unassign(&assignees, id)?;
        }
        changes.assignees = Some(assignees);
    }
    if changes.is_empty() {
        return Err(CliError::Usage(
            "nothing to change — pass at least one of --title, --description, \
             --execution-state, --assign, --unassign, --goal"
                .into(),
        ));
    }

    let board_address = board.coordinate();
    let builder = build_card_update_event(&board_address, &card, &changes)?;
    let event = sign_and_submit(client, builder, "relay reported card event as duplicate").await?;
    println!("event_id   {}", event.id.to_hex());
    println!(
        "coordinate {KIND_BOARD_CARD}:{}:{card_id}",
        event.pubkey.to_hex()
    );
    println!("board      {board_address}");
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn cmd_card_move(
    client: &BuzzClient,
    board_id: &str,
    card_id: &str,
    list: &str,
    position: MovePosition,
) -> Result<(), CliError> {
    let (board, card) = fetch_card_for_update(client, board_id, card_id).await?;
    let list = resolve_list(&board, Some(list))?;

    // Rank off the reconciled target column, excluding the moving card
    // itself — within-column moves must not anchor off their own head.
    let cards = fetch_board_cards(client, &board.id).await?;
    let column: Vec<CardSnapshot> = cards
        .into_iter()
        .filter(|c| c.list_id == list.id && c.id != card.id)
        .collect();
    let rank = compute_move_rank(&column, &position)?;

    let changes = CardChanges {
        list_id: Some(list.id.clone()),
        rank: Some(rank.clone()),
        ..Default::default()
    };
    let board_address = board.coordinate();
    let builder = build_card_update_event(&board_address, &card, &changes)?;
    let event = sign_and_submit(client, builder, "relay reported card event as duplicate").await?;
    println!("event_id   {}", event.id.to_hex());
    println!(
        "coordinate {KIND_BOARD_CARD}:{}:{card_id}",
        event.pubkey.to_hex()
    );
    println!("board      {board_address}");
    println!("list       {} ({})", list.title, list.id);
    println!("rank       {rank}");
    Ok(())
}

/// One board the seed command knows how to create.
#[derive(Debug, Clone, Copy)]
struct SeedBoard {
    id: &'static str,
    title: &'static str,
    brand: Option<&'static str>,
    description: &'static str,
}

/// One card the seed command knows how to file.
#[derive(Debug, Clone, Copy)]
struct SeedCard {
    board_id: &'static str,
    title: &'static str,
    function_area: &'static str,
    description: &'static str,
}

/// Boards created by `buzz board seed`. The five customer-facing brands, the
/// `hvgapp` platform board, plus Unified Master for cross-brand coordination. Order matters for the CLI
/// report; creation itself is independent.
const SEED_BOARDS: &[SeedBoard] = &[
    SeedBoard {
        id: "unified-master",
        title: "Unified Master",
        brand: None,
        description: "Cross-brand coordination board. Goals, loops, and work that spans the six-brand operation live here.",
    },
    SeedBoard {
        id: "hvgapp",
        title: "hvg.app",
        brand: Some("hvgapp"),
        description: "The Buzz operating platform itself: relay, desktop, agent harness, board, and the pipelines the team runs on. Platform work, not brand work.",
    },
    SeedBoard {
        id: "clean",
        title: "Clean Startup",
        brand: Some("clean"),
        description: "Branson MO short-term-rental turnover cleaning: hosts, property managers, quote and booking automation.",
    },
    SeedBoard {
        id: "itshvg",
        title: "High Value Growth",
        brand: Some("itshvg"),
        description: "Reviews of tools, apps and AI for SMB owners already running a real business.",
    },
    SeedBoard {
        id: "lhfyc",
        title: "Look How Far You've Come",
        brand: Some("lhfyc"),
        description: "Milestone-based peer accountability and escrow crowdfunding: daily habit verification, pledges, proof, community.",
    },
    SeedBoard {
        id: "gomarco",
        title: "Go Marco",
        brand: Some("gomarco"),
        description: "Group travel intelligence: live voice Powwows, loyalty and card reward consolidation, community trip research.",
    },
    SeedBoard {
        id: "three",
        title: "We 3 Live",
        brand: Some("three"),
        description: "Christian lifestyle hub: satire, teaching, directory, streaming, events.",
    },
];

/// Seed cards for the two P0 brand boards. Every card is one capability, not
/// one page, per `PLANS/BUILD_WORKFLOW.md`. Descriptions carry the open
/// product questions so they surface when the card is picked up.
const SEED_CARDS: &[SeedCard] = &[
    // Shared foundation — build once against clean, instantiate for itshvg later.
    SeedCard {
        board_id: "clean",
        title: "Repo scaffold + deploy pipeline",
        function_area: "build",
        description: "Stand up the clean repo and its Vercel project from a single input — the repo name — so service names cannot drift apart. This is the first real exercise of the same-name-everywhere rule; whatever it takes to make it one command is the template the other four brands inherit.",
    },
    SeedCard {
        board_id: "clean",
        title: "Design foundation — tokens, type scale, logo slot",
        function_area: "design",
        description: "Colour tokens, type scale, spacing, and a logo slot that survives a brand not having a logo yet. Specced before any page is built; every later card consumes it rather than inventing its own values.",
    },
    SeedCard {
        board_id: "clean",
        title: "Analytics + conversion tracking baseline",
        function_area: "build",
        description: "Page and event tracking wired before launch, not after. Retrofitting attribution loses the first cohort permanently — the one cohort that tells you whether the launch worked.",
    },
    // Clean Startup — local-service archetype.
    SeedCard {
        board_id: "clean",
        title: "Service catalogue as data",
        function_area: "build",
        description: "Model turnover cleans, deep cleans, restocking/staging, laundry and inspection reports as structured data, not hand-written pages. Every downstream surface — service pages, pricing, the quote form's service picker, service-area pages — reads from this one source. Getting it wrong is cheap now and a migration later.",
    },
    SeedCard {
        board_id: "clean",
        title: "Quote request flow",
        function_area: "build",
        description: "The money path: a host asks for a quote and it reaches a human. Destination today is team@thecleanstartup.com, CC pete.oleary@icloud.com. Send through a swappable adapter, never a hardcoded mailto — Pipeline (the CRM) replaces this destination once Clean Startup and HVG are live, and that must be a config change rather than a rewrite of the highest-value path on the site.",
    },
    SeedCard {
        board_id: "clean",
        title: "Booking / scheduling handoff",
        function_area: "build",
        description: "Let a host book a slot rather than wait for a reply. Likely an integration with an existing scheduler rather than a build — confirm which before sizing, since that choice is the difference between a day and a sprint.",
    },
    SeedCard {
        board_id: "clean",
        title: "Local SEO foundation",
        function_area: "marketing",
        description: "NAP consistency, LocalBusiness schema, Branson geo signals, service-area markup. For a local service business this is not polish — it is most of how the audience arrives at all.",
    },
    SeedCard {
        board_id: "clean",
        title: "Turnover-quality proof surface",
        function_area: "content",
        description: "Before/after galleries and inspection photos. For this brand proof is the marketing: the inspection report is a thing the host forwards to their own guest, so it sells twice. Design it as an artifact a host wants to share, not a gallery on our site.",
    },
    SeedCard {
        board_id: "clean",
        title: "Reviews and testimonials",
        function_area: "marketing",
        description: "Surface real host reviews. Local-service conversion leans on social proof harder than on copy — a page of testimonials outperforms a page of adjectives.",
    },
    SeedCard {
        board_id: "clean",
        title: "Service-area expansion structure",
        function_area: "build",
        description: "Branson first, other vacation-rental hubs later. Build the structure now — area as data, not as a hardcoded page — so launching market #2 is a content entry rather than a refactor. Cheap today, expensive the moment a second city exists.",
    },
    SeedCard {
        board_id: "clean",
        title: "Legal and ops pages",
        function_area: "other",
        description: "Privacy, terms, service area, contact. Unglamorous and blocking: a lead-capturing site without a privacy policy is a problem you find out about from someone else.",
    },
    // itshvg — content-hub archetype.
    SeedCard {
        board_id: "itshvg",
        title: "Review content model",
        function_area: "build",
        description: "Verdict, rating, pros/cons, tested-on date, price tier, and what \"tested\" means for this brand. Do this before any review is written — get it wrong and every review published afterwards needs migrating, which is how content sites end up frozen. This is the one HVG card that is expensive to change later.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Review index and taxonomy",
        function_area: "build",
        description: "Browse and filter by category, price tier and verdict. Reads entirely from H1's model; if this card needs fields H1 does not have, H1 was wrong and gets fixed first.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Review structured data",
        function_area: "marketing",
        description: "Review / Product schema on every review. For a review site this is not SEO garnish — it is the difference between being eligible for rich results and being invisible in the surface where buying decisions start.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Newsletter capture and provider",
        function_area: "marketing",
        description: "Capture, double opt-in, and a provider wired end to end. Of the four channels, the newsletter is the only audience we own outright rather than rent — the others can change their algorithm on us.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Short-form and YouTube surface",
        function_area: "content",
        description: "Embeds and syndication so video and short-form have a home on the site instead of living only on someone else's platform. Feeds the same review model rather than a parallel one.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Affiliate disclosure and link handling",
        function_area: "other",
        description: "A review site with monetised links carries FTC disclosure obligations. Structural, not a footer note — disclosure needs to sit with the recommendation, and links need a single place to be managed and audited. Confirm the day-one monetisation posture before sizing: it decides whether this is a component or a link-management layer.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Lead-gen and services CTA",
        function_area: "sales",
        description: "Route readers to bespoke AI builds, consulting and done-for-you work. Highest-margin line HVG has, and it is the reason the content engine earns rather than just attracts.",
    },
    SeedCard {
        board_id: "itshvg",
        title: "Legal pages",
        function_area: "other",
        description: "Privacy, terms, disclosure, contact. Same reasoning as C8, plus the disclosure page H6 points at.",
    },
];

/// Create the standard boards and file the seed cards. Idempotent: boards are
/// skipped by dtag, cards are skipped when a card with the same title already
/// exists on the reconciled board head.
pub async fn cmd_seed(client: &BuzzClient, dry_run: bool) -> Result<(), CliError> {
    let mut created_boards: Vec<&str> = Vec::new();
    let mut skipped_boards: Vec<&str> = Vec::new();
    let mut created_cards: Vec<serde_json::Value> = Vec::new();
    let mut skipped_cards: Vec<serde_json::Value> = Vec::new();

    // Pass 1: ensure every board exists. If it does not, create it with the
    // standard five-column shape. Idempotency is by board dtag.
    for board in SEED_BOARDS {
        let existing = fetch_board_head(client, board.id).await?;
        if existing.is_some() {
            skipped_boards.push(board.id);
            continue;
        }
        if dry_run {
            created_boards.push(board.id);
            continue;
        }
        let lists = build_default_lists()?;
        let builder = build_board_event(
            board.id,
            board.title,
            Some(board.description),
            board.brand,
            &lists,
        )?;
        sign_and_submit(client, builder, "relay reported board event as duplicate").await?;
        created_boards.push(board.id);
    }

    // Pass 2: file seed cards. For idempotency we skip cards whose title already
    // exists on the reconciled board head; card ids are random UUIDs, so title
    // is the only stable handle seeding has.
    for card in SEED_CARDS {
        let board = match fetch_board_head(client, card.board_id).await? {
            Some(b) => b,
            None if dry_run => {
                // The board would be created in pass 1; plan the card against
                // its would-be shape without contacting the relay.
                let seed = SEED_BOARDS
                    .iter()
                    .find(|b| b.id == card.board_id)
                    .ok_or_else(|| {
                        CliError::Other(format!(
                            "seed card {:?} targets unknown board {}",
                            card.title, card.board_id
                        ))
                    })?;
                let me = client.keys().public_key().to_hex();
                BoardSnapshot {
                    event_id: String::new(),
                    owner: me,
                    id: seed.id.to_string(),
                    title: seed.title.to_string(),
                    description: Some(seed.description.to_string()),
                    brand_scope: seed.brand.map(String::from),
                    lists: build_default_lists()?,
                    updated_at: 0,
                }
            }
            None => {
                // Should not happen — we just created it — but fail closed.
                return Err(CliError::Other(format!(
                    "seed board {} vanished after creation; cannot file {}",
                    card.board_id, card.title
                )));
            }
        };
        let board_brand = board.brand_scope.as_deref().ok_or_else(|| {
            CliError::Other(format!(
                "seed card {:?} targets board {} which has no brand scope",
                card.title, board.id
            ))
        })?;
        let cards = fetch_board_cards(client, &board.id).await?;
        if cards.iter().any(|c| c.title == card.title) {
            skipped_cards.push(serde_json::json!({
                "board": board.id,
                "title": card.title,
            }));
            continue;
        }
        if dry_run {
            created_cards.push(serde_json::json!({
                "board": board.id,
                "title": card.title,
            }));
            continue;
        }
        let list = resolve_list(&board, None)?;
        let last_rank = cards
            .iter()
            .filter(|c| c.list_id == list.id)
            .map(|c| c.rank.as_str())
            .next_back();
        let rank = rank_between(last_rank, None)?;
        let card_id = uuid::Uuid::new_v4().to_string();
        let me = client.keys().public_key().to_hex();
        let builder = build_card_event(
            &board.coordinate(),
            &card_id,
            card.title,
            card.description,
            board_brand,
            card.function_area,
            &[],
            "idle",
            &rank,
            &list.id,
            &me,
        )?;
        let event =
            sign_and_submit(client, builder, "relay reported card event as duplicate").await?;
        created_cards.push(serde_json::json!({
            "board": board.id,
            "title": card.title,
            "cardId": card_id,
            "eventId": event.id.to_hex(),
            "coordinate": format!("{KIND_BOARD_CARD}:{}:{card_id}", event.pubkey.to_hex()),
        }));
    }

    let out = serde_json::json!({
        "dryRun": dry_run,
        "boards": {
            "created": created_boards,
            "skipped": skipped_boards,
        },
        "cards": {
            "created": created_cards,
            "skipped": skipped_cards,
        },
    });
    println!(
        "{}",
        serde_json::to_string_pretty(&out)
            .map_err(|e| CliError::Other(format!("failed to serialize seed result: {e}")))?
    );
    Ok(())
}

pub async fn dispatch(cmd: crate::BoardCmd, client: &BuzzClient) -> Result<(), CliError> {
    use crate::{BoardCardCmd, BoardCmd, BoardGoalCmd};
    match cmd {
        BoardCmd::Ls { brand, limit } => cmd_ls(client, brand.as_deref(), limit).await,
        BoardCmd::Get { board_id } => cmd_get(client, &board_id).await,
        BoardCmd::Create {
            id,
            title,
            brand,
            description,
            lists,
        } => {
            cmd_create(
                client,
                &id,
                &title,
                brand.as_deref(),
                description.as_deref(),
                lists.as_deref(),
            )
            .await
        }
        BoardCmd::Card(BoardCardCmd::Add {
            board,
            title,
            description,
            brand,
            function_area,
            list,
            assignees,
            goal,
        }) => {
            cmd_card_add(
                client,
                &board,
                &title,
                &description,
                &brand,
                &function_area,
                list.as_deref(),
                &assignees,
                goal.as_deref(),
            )
            .await
        }
        BoardCmd::Card(BoardCardCmd::Set {
            board,
            card,
            title,
            description,
            execution_state,
            assigns,
            unassigns,
            goal,
        }) => {
            cmd_card_set(
                client,
                &board,
                &card,
                title.as_deref(),
                description.as_deref(),
                execution_state.as_deref(),
                &assigns,
                &unassigns,
                goal.as_deref(),
            )
            .await
        }
        BoardCmd::Card(BoardCardCmd::Move {
            board,
            card,
            list,
            top,
            bottom,
            before,
            after,
        }) => {
            let position = if top {
                MovePosition::Top
            } else if let Some(id) = before {
                MovePosition::Before(id)
            } else if let Some(id) = after {
                MovePosition::After(id)
            } else {
                // `--bottom` is also the default when no position flag is given.
                let _ = bottom;
                MovePosition::Bottom
            };
            cmd_card_move(client, &board, &card, &list, position).await
        }
        BoardCmd::Card(BoardCardCmd::Approve {
            board,
            card,
            reason,
        }) => cmd_card_approve(client, &board, &card, reason.as_deref()).await,
        BoardCmd::Card(BoardCardCmd::Deny {
            board,
            card,
            reason,
        }) => cmd_card_deny(client, &board, &card, reason.as_deref()).await,
        BoardCmd::Goal(BoardGoalCmd::Create {
            id,
            brand,
            framework,
            specific,
            measurable,
            attainable,
            relevant,
            time_bound,
            objective,
            krs,
            purposeful,
            actionable,
            continuous,
            trackable,
        }) => {
            cmd_goal_create(
                client,
                &id,
                &brand,
                &GoalCreateArgs {
                    framework,
                    specific,
                    measurable,
                    attainable,
                    relevant,
                    time_bound,
                    objective,
                    krs,
                    purposeful,
                    actionable,
                    continuous,
                    trackable,
                },
            )
            .await
        }
        BoardCmd::Seed { dry_run } => cmd_seed(client, dry_run).await,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr::{Keys, Timestamp};

    const TUN: &str = "845798e38eb7c9bfdca6df7e18e77650a5b773c2ec56d746034ee9ab748cbb39";

    fn assignee(id: &str, role: Option<&str>) -> AssigneeEntry {
        AssigneeEntry {
            kind: "agent".into(),
            id: id.into(),
            role: role.map(str::to_string),
        }
    }

    #[test]
    fn profile_label_prefers_display_name_over_name() {
        let profile = serde_json::json!({"display_name": "TUN", "name": "tunechi"});
        assert_eq!(profile_label(&profile).as_deref(), Some("TUN"));
    }

    #[test]
    fn profile_label_falls_back_to_name() {
        // Agent keys carry `display_name`; a plain NIP-01 profile may set only
        // `name`, and must still resolve rather than dropping to a prefix.
        let profile = serde_json::json!({"name": "tunechi"});
        assert_eq!(profile_label(&profile).as_deref(), Some("tunechi"));
    }

    #[test]
    fn profile_label_rejects_blank_and_missing_names() {
        assert_eq!(profile_label(&serde_json::json!({})), None);
        assert_eq!(
            profile_label(&serde_json::json!({"display_name": "   "})),
            None
        );
        // A blank `display_name` must not shadow a usable `name`.
        assert_eq!(
            profile_label(&serde_json::json!({"display_name": "", "name": "TUN"})).as_deref(),
            Some("TUN")
        );
        // Non-string values are ignored, not stringified.
        assert_eq!(profile_label(&serde_json::json!({"display_name": 7})), None);
    }

    /// Pinned against `truncatePubkey` in `desktop/src/shared/lib/pubkey.ts`.
    /// Change one side without the other and the same unresolved key reads two
    /// different ways depending on which surface you are looking at.
    #[test]
    fn pubkey_fallback_matches_the_canonical_compact_form() {
        let label = pubkey_fallback_label(TUN);
        assert_eq!(label, "845798e3\u{2026}bb39");
        assert!(!label.contains(TUN));
    }

    #[test]
    fn pubkey_fallback_leaves_short_values_intact() {
        // `truncatePubkey` returns anything <= 12 chars unchanged; truncating
        // it would be longer than the value itself.
        assert_eq!(pubkey_fallback_label("abc"), "abc");
        assert_eq!(pubkey_fallback_label("123456789012"), "123456789012");
        assert_eq!(
            pubkey_fallback_label("1234567890123"),
            "12345678\u{2026}0123"
        );
    }

    #[test]
    fn assignee_display_uses_the_resolved_label() {
        let labels = std::collections::HashMap::from([(TUN.to_string(), "TUN".to_string())]);
        assert_eq!(
            assignee_display(&assignee(TUN, Some("lead")), &labels),
            serde_json::json!({"type": "agent", "id": TUN, "role": "lead", "name": "TUN"})
        );
    }

    #[test]
    fn assignee_display_falls_back_when_the_key_is_unresolved() {
        let labels = std::collections::HashMap::new();
        let out = assignee_display(&assignee(TUN, None), &labels);
        assert_eq!(out["name"], serde_json::json!("845798e3\u{2026}bb39"));
        assert_eq!(out["role"], serde_json::Value::Null);
        // The full pubkey stays available for callers that need to act on it.
        assert_eq!(out["id"], serde_json::json!(TUN));
    }

    /// A card may store a pubkey in any case; the relay echoes lowercase. The
    /// label lookup must resolve regardless, or an upper-case id silently falls
    /// back to a prefix in the CLI while Desktop (which normalizes) resolves it.
    #[test]
    fn assignee_display_resolves_regardless_of_pubkey_case() {
        let labels = std::collections::HashMap::from([(TUN.to_string(), "TUN".to_string())]);
        let out = assignee_display(&assignee(&TUN.to_uppercase(), Some("lead")), &labels);
        assert_eq!(out["name"], serde_json::json!("TUN"));
    }

    /// `AssigneeEntry` is serialized straight into card event content, which is
    /// pinned byte-for-byte against the TypeScript `Assignee` interface. The
    /// display-only `name` must never leak into that struct's own output.
    #[test]
    fn assignee_entry_serialization_stays_free_of_the_display_name() {
        assert_eq!(
            serde_json::to_string(&assignee(TUN, Some("lead"))).unwrap(),
            format!(r#"{{"type":"agent","id":"{TUN}","role":"lead"}}"#)
        );
    }

    /// The `role: None` arm of the same pin: `skip_serializing_if` must drop the
    /// key entirely rather than emitting `"role":null`, which is what the TS
    /// `Assignee` interface does.
    #[test]
    fn assignee_entry_serialization_omits_an_absent_role() {
        assert_eq!(
            serde_json::to_string(&assignee(TUN, None)).unwrap(),
            format!(r#"{{"type":"agent","id":"{TUN}"}}"#)
        );
    }

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
        let mut rust_slugs: Vec<String> = BRAND_SLUGS.iter().map(|s| s.to_string()).collect();
        rust_slugs.sort_unstable();
        assert_eq!(rust_slugs, fixture_slugs);
    }

    #[test]
    fn validate_brand_rejects_unknown() {
        assert!(validate_brand("clean").is_ok());
        assert!(validate_brand("hvgapp").is_ok());
        assert!(validate_brand("cleanstartup").is_err());
        assert!(validate_brand("Clean").is_err());
        assert!(validate_brand("").is_err());
        // Pre-rekey platform slug — do not re-admit. Live hvgapp board
        // still says `hvg-app`; that is a P5 rekey, not a validator hole.
        assert!(validate_brand("hvg-app").is_err());
    }

    #[test]
    fn validate_function_area_matches_ts_enum() {
        for area in FUNCTION_AREAS {
            assert!(validate_function_area(area).is_ok());
        }
        assert!(validate_function_area("engineering").is_err());
        assert!(validate_function_area("").is_err());
    }

    fn sign(builder: EventBuilder) -> Event {
        builder.sign_with_keys(&Keys::generate()).unwrap()
    }

    fn tag_slices(event: &Event) -> Vec<Vec<String>> {
        event.tags.iter().map(|t| t.as_slice().to_vec()).collect()
    }

    fn owned(expected: &[&[&str]]) -> Vec<Vec<String>> {
        expected
            .iter()
            .map(|t| t.iter().map(|s| s.to_string()).collect())
            .collect()
    }

    #[test]
    fn build_board_event_matches_ts_template() {
        let lists = vec![BoardListEntry {
            id: "list-1".into(),
            title: "Backlog".into(),
            rank: "n".into(),
        }];
        let event = sign(
            build_board_event("clean-board", "Clean Startup", None, Some("clean"), &lists).unwrap(),
        );
        assert_eq!(event.kind, kind_board());
        assert_eq!(
            tag_slices(&event),
            owned(&[&["d", "clean-board"], &["t", "brand:clean"]])
        );
        // Byte-exact: TS key order is title, description?, brandScope?, lists.
        assert_eq!(
            event.content,
            r#"{"title":"Clean Startup","brandScope":"clean","lists":[{"id":"list-1","title":"Backlog","rank":"n"}]}"#
        );
    }

    #[test]
    fn build_board_event_omits_absent_optionals() {
        let lists = vec![BoardListEntry {
            id: "l".into(),
            title: "Backlog".into(),
            rank: "n".into(),
        }];
        let event = sign(build_board_event("b", "T", None, None, &lists).unwrap());
        assert_eq!(tag_slices(&event), owned(&[&["d", "b"]]));
        assert_eq!(
            event.content,
            r#"{"title":"T","lists":[{"id":"l","title":"Backlog","rank":"n"}]}"#
        );
    }

    #[test]
    fn build_board_event_rejects_invalid_list_rank() {
        let lists = vec![BoardListEntry {
            id: "l".into(),
            title: "Backlog".into(),
            rank: "na".into(), // trailing 'a' — downward subdivision impossible
        }];
        assert!(build_board_event("b", "T", None, None, &lists).is_err());
    }

    #[test]
    fn build_card_event_matches_ts_template() {
        let assignee = AssigneeEntry {
            kind: "agent".into(),
            id: "ab".repeat(32),
            role: Some("executor".into()),
        };
        let owner = "cd".repeat(32);
        let board_address = format!("30623:{owner}:operations");
        let event = sign(
            build_card_event(
                &board_address,
                "card-1",
                "Ship the Board store",
                "Persist Board state over Nostr.",
                "clean",
                "build",
                &[assignee],
                "idle",
                "m",
                "backlog",
                &owner,
            )
            .unwrap(),
        );
        assert_eq!(event.kind, kind_board_card());
        assert_eq!(
            tag_slices(&event),
            owned(&[
                &["d", "card-1"],
                &["a", board_address.as_str()],
                &["l", "backlog"],
                &["t", "brand:clean"],
                &["t", "fn:build"],
                // 4 elements always; role "" when unset.
                &["p", "ab".repeat(32).as_str(), "", "executor"],
                &["rank", "m"],
            ])
        );
        assert_eq!(
            event.content,
            format!(
                r#"{{"title":"Ship the Board store","description":"Persist Board state over Nostr.","assignees":[{{"type":"agent","id":"{}","role":"executor"}}],"executionState":"idle","createdBy":"{}","comments":[]}}"#,
                "ab".repeat(32),
                owner
            )
        );
    }

    #[test]
    fn build_card_event_assignee_without_role_emits_empty_role_tag() {
        let assignee = AssigneeEntry {
            kind: "agent".into(),
            id: "ab".repeat(32),
            role: None,
        };
        let owner = "cd".repeat(32);
        let event = sign(
            build_card_event(
                &format!("30623:{owner}:b"),
                "c",
                "t",
                "d",
                "clean",
                "build",
                &[assignee],
                "idle",
                "n",
                "l",
                &owner,
            )
            .unwrap(),
        );
        assert!(tag_slices(&event).iter().any(|t| t
            == &vec![
                "p".to_string(),
                "ab".repeat(32),
                String::new(),
                String::new()
            ]));
        // role key omitted from content when unset (TS: `role?` undefined).
        assert!(event
            .content
            .contains(r#""assignees":[{"type":"agent","id":"#));
        assert!(!event.content.contains("role"));
    }

    #[test]
    fn build_card_event_rejects_contract_violations() {
        let owner = "cd".repeat(32);
        let addr = format!("30623:{owner}:b");
        let base = |rank: &str| {
            build_card_event(
                &addr,
                "c",
                "t",
                "d",
                "clean",
                "build",
                &[],
                "idle",
                rank,
                "l",
                &owner,
            )
        };
        assert!(base("na").is_err()); // invalid rank
        assert!(base("").is_err());
        assert!(build_card_event(
            "30624:x:y",
            "c",
            "t",
            "d",
            "clean",
            "build",
            &[],
            "idle",
            "n",
            "l",
            &owner
        )
        .is_err());
        assert!(build_card_event(
            &addr,
            "",
            "t",
            "d",
            "clean",
            "build",
            &[],
            "idle",
            "n",
            "l",
            &owner
        )
        .is_err());
        assert!(build_card_event(
            &addr,
            "c",
            "t",
            "d",
            "clean",
            "nope",
            &[],
            "idle",
            "n",
            "l",
            &owner
        )
        .is_err());
        assert!(build_card_event(
            &addr,
            "c",
            "t",
            "d",
            "clean",
            "build",
            &[],
            "done",
            "n",
            "l",
            &owner
        )
        .is_err());
    }

    #[test]
    fn build_approval_event_granted_matches_ts_template() {
        let owner = "cd".repeat(32);
        let card_address = format!("30624:{owner}:card-1");
        let event =
            sign(build_approval_event(&card_address, true, Some("spec signed off")).unwrap());
        assert_eq!(event.kind, Kind::Custom(KIND_BOARD_APPROVAL_GRANTED as u16));
        assert_eq!(tag_slices(&event), owned(&[&["a", card_address.as_str()]]));
        // Byte-exact: TS key order is reason?, policySnapshot?.
        assert_eq!(event.content, r#"{"reason":"spec signed off"}"#);
    }

    #[test]
    fn build_approval_event_denied_omits_reason_when_absent() {
        let owner = "cd".repeat(32);
        let card_address = format!("30624:{owner}:card-1");
        let event = sign(build_approval_event(&card_address, false, None).unwrap());
        assert_eq!(event.kind, Kind::Custom(KIND_BOARD_APPROVAL_DENIED as u16));
        assert_eq!(tag_slices(&event), owned(&[&["a", card_address.as_str()]]));
        assert_eq!(event.content, "{}");
    }

    #[test]
    fn build_approval_event_rejects_invalid_card_address() {
        assert!(build_approval_event("30623:cd:card", true, None).is_err()); // wrong kind
        assert!(build_approval_event("30624:not-hex:card", true, None).is_err());
        assert!(build_approval_event("30624:cd", true, None).is_err()); // missing dtag
    }

    #[test]
    fn parse_card_address_dtag_extracts_id() {
        let owner = "cd".repeat(32);
        assert_eq!(
            parse_card_address_dtag(&format!("30624:{owner}:card-1")),
            Some("card-1")
        );
        assert!(parse_card_address_dtag("30623:cd:card").is_none());
        assert!(parse_card_address_dtag("30624:not-hex:card").is_none());
    }

    fn board_event(keys: &Keys, ts: u64, id: &str, title: &str) -> Event {
        EventBuilder::new(kind_board(), format!(r#"{{"title":"{title}","lists":[]}}"#))
            .tags(vec![Tag::parse(["d", id]).unwrap()])
            .custom_created_at(Timestamp::from(ts))
            .sign_with_keys(keys)
            .unwrap()
    }

    #[test]
    fn reconcile_latest_created_at_wins_across_authors() {
        let alice = Keys::generate();
        let bob = Keys::generate();
        let older = board_event(&alice, 100, "ops", "old");
        let newer = board_event(&bob, 200, "ops", "new");
        let heads = reconcile_by_dtag(vec![older, newer.clone()]);
        assert_eq!(heads.len(), 1);
        assert_eq!(heads[0].id, newer.id);
    }

    #[test]
    fn reconcile_tie_breaks_to_smaller_event_id() {
        // Same author signs two different contents at the same second — two
        // distinct event ids, deterministic winner.
        let keys = Keys::generate();
        let a = board_event(&keys, 100, "ops", "aaa");
        let b = board_event(&keys, 100, "ops", "bbb");
        let winner = std::cmp::min(a.id.to_hex(), b.id.to_hex());
        for order in [vec![a.clone(), b.clone()], vec![b, a]] {
            let heads = reconcile_by_dtag(order);
            assert_eq!(heads.len(), 1);
            assert_eq!(heads[0].id.to_hex(), winner);
        }
    }

    #[test]
    fn reconcile_skips_events_without_unique_d_tag() {
        let keys = Keys::generate();
        let two_d = EventBuilder::new(kind_board(), r#"{"title":"x","lists":[]}"#)
            .tags(vec![
                Tag::parse(["d", "one"]).unwrap(),
                Tag::parse(["d", "two"]).unwrap(),
            ])
            .sign_with_keys(&keys)
            .unwrap();
        assert!(reconcile_by_dtag(vec![two_d]).is_empty());
    }

    #[test]
    fn parse_assignee_accepts_bare_and_roled() {
        let hex = "ab".repeat(32);
        let bare = parse_assignee(&hex).unwrap();
        assert_eq!(bare.kind, "agent");
        assert_eq!(bare.role, None);
        let roled = parse_assignee(&format!("{hex}:lead")).unwrap();
        assert_eq!(roled.role.as_deref(), Some("lead"));
        assert!(parse_assignee(&format!("{hex}:boss")).is_err());
        assert!(parse_assignee("not-hex").is_err());
    }

    #[test]
    fn parse_lists_csv_trims_and_rejects_empty_entries() {
        assert_eq!(
            parse_lists_csv("Backlog, Spec'd, Done").unwrap(),
            vec!["Backlog", "Spec'd", "Done"]
        );
        assert!(parse_lists_csv("Backlog,,Done").is_err());
    }

    #[test]
    fn default_lists_have_uuid_ids_and_valid_chained_ranks() {
        let lists = build_default_lists().unwrap();
        assert_eq!(lists.len(), 5);
        assert_eq!(
            lists.iter().map(|l| l.title.as_str()).collect::<Vec<_>>(),
            DEFAULT_LIST_TITLES
        );
        let mut prev: Option<&str> = None;
        for list in &lists {
            assert!(uuid::Uuid::parse_str(&list.id).is_ok());
            assert!(is_valid_rank(&list.rank));
            if let Some(prev) = prev {
                assert!(prev < list.rank.as_str());
            }
            prev = Some(&list.rank);
        }
    }

    #[test]
    fn seed_boards_are_valid() {
        let board_ids: std::collections::HashSet<&str> = SEED_BOARDS.iter().map(|b| b.id).collect();
        assert_eq!(
            board_ids.len(),
            SEED_BOARDS.len(),
            "seed board ids are unique"
        );
        assert!(board_ids.contains("unified-master"));
        for board in SEED_BOARDS {
            assert!(!board.title.is_empty());
            assert!(!board.description.is_empty());
            if let Some(brand) = board.brand {
                assert!(
                    BRAND_SLUGS.contains(&brand),
                    "{} has a locked brand",
                    board.id
                );
            }
        }
    }

    #[test]
    fn seed_cards_are_valid_and_target_known_boards() {
        let board_ids: std::collections::HashSet<&str> = SEED_BOARDS.iter().map(|b| b.id).collect();
        assert_eq!(
            SEED_CARDS.len(),
            19,
            "seed card count matches BOARD_SEED_CARDS.md"
        );
        let mut seen = std::collections::HashSet::new();
        for card in SEED_CARDS {
            assert!(
                board_ids.contains(card.board_id),
                "{} targets a known seed board",
                card.title
            );
            assert!(!card.title.is_empty());
            assert!(!card.description.is_empty());
            assert!(
                FUNCTION_AREAS.contains(&card.function_area),
                "{} has a known function area",
                card.title
            );
            assert!(
                seen.insert((card.board_id, card.title)),
                "duplicate seed card title: {}",
                card.title
            );
        }
    }

    #[test]
    fn seed_board_events_build_cleanly() {
        for board in SEED_BOARDS {
            let lists = build_default_lists().unwrap();
            let event = sign(
                build_board_event(
                    board.id,
                    board.title,
                    Some(board.description),
                    board.brand,
                    &lists,
                )
                .unwrap(),
            );
            assert_eq!(event.kind, kind_board());
            let snapshot = BoardSnapshot::from_event(&event).unwrap();
            assert_eq!(snapshot.id, board.id);
            assert_eq!(snapshot.title, board.title);
            assert_eq!(snapshot.brand_scope, board.brand.map(str::to_owned));
        }
    }

    #[test]
    fn seed_card_events_build_cleanly() {
        let owner = "cd".repeat(32);
        let board_address = format!("{KIND_BOARD}:{owner}:clean");
        for card in SEED_CARDS.iter().filter(|c| c.board_id == "clean") {
            let event = sign(
                build_card_event(
                    &board_address,
                    "card-id",
                    card.title,
                    card.description,
                    "clean",
                    card.function_area,
                    &[],
                    "idle",
                    "n",
                    "list-id",
                    &owner,
                )
                .unwrap(),
            );
            assert_eq!(event.kind, kind_board_card());
            let snapshot = CardSnapshot::from_event(&event).unwrap();
            assert_eq!(snapshot.title, card.title);
            assert_eq!(snapshot.function_area, card.function_area);
            assert_eq!(snapshot.brand, "clean");
        }
    }

    // --- card set / move (update path) ---

    fn snap(id: &str, rank: &str) -> CardSnapshot {
        CardSnapshot {
            event_id: String::new(),
            owner: "cd".repeat(32),
            id: id.to_owned(),
            board_id: "b".into(),
            list_id: "l".into(),
            rank: rank.to_owned(),
            brand: "clean".into(),
            function_area: "build".into(),
            title: format!("title-{id}"),
            description: "d".into(),
            execution_state: "idle".into(),
            assignees: vec![],
            created_by: "cd".repeat(32),
            linked_git_issue: None,
            feed_forward_context: None,
            comments: vec![],
            parent_goal_id: None,
            source_lineage: None,
            approval_decision: None,
            updated_at: 0,
        }
    }

    /// A fully-loaded head event the way Desktop stores it — every optional
    /// content field present, keys deliberately out of contract order to
    /// prove the update rebuilds content in `parseCard` spread order, not in
    /// the order the head happened to store.
    fn rich_card_event(keys: &Keys) -> Event {
        let assignee = "ab".repeat(32);
        let author = "cd".repeat(32);
        let trigger = "ef".repeat(32);
        let content = format!(
            r#"{{"comments":[{{"id":"c1","authorId":"{author}","body":"hi","createdAt":"2026-08-13T00:00:00Z"}}],"title":"Old title","approvalDecision":{{"state":"approved"}},"description":"Old desc","assignees":[{{"type":"agent","id":"{assignee}","role":"lead"}}],"executionState":"running","parentGoalId":"goal-1","createdBy":"{author}","linkedGitIssue":"buzz://issue?id=abc","sourceLineage":{{"ruleId":"rule-1","triggerEventId":"{trigger}"}},"feedForwardContext":{{"note":"from rule"}}}}"#
        );
        let owner = "cd".repeat(32);
        EventBuilder::new(kind_board_card(), content)
            .tags(vec![
                Tag::parse(["d", "card-1"]).unwrap(),
                Tag::parse(["a", &format!("30623:{owner}:b")]).unwrap(),
                Tag::parse(["l", "l-backlog"]).unwrap(),
                Tag::parse(["t", "brand:clean"]).unwrap(),
                Tag::parse(["t", "fn:build"]).unwrap(),
                Tag::parse(["p", &assignee, "", "lead"]).unwrap(),
                Tag::parse(["rank", "n"]).unwrap(),
                Tag::parse(["feedRule", "rule-1", &trigger]).unwrap(),
                Tag::parse(["e", &trigger]).unwrap(),
            ])
            .sign_with_keys(keys)
            .unwrap()
    }

    /// The update path preserves every field the CLI did not touch and emits
    /// content in Desktop's update order: `updateCard` spreads the *parsed*
    /// card, so optionals sit where `parseCard` re-inserts them —
    /// linkedGitIssue before createdBy, feedForwardContext before comments,
    /// parentGoalId/sourceLineage/approvalDecision after. Comments re-emit in
    /// `parseComments` order (id, authorId, body, createdAt), not the order
    /// the head happened to store.
    #[test]
    fn card_update_preserves_head_fields_in_ts_order() {
        let keys = Keys::generate();
        let head = CardSnapshot::from_event(&rich_card_event(&keys)).unwrap();
        let owner = "cd".repeat(32);
        let changes = CardChanges {
            title: Some("New title".into()),
            ..Default::default()
        };
        let event =
            sign(build_card_update_event(&format!("30623:{owner}:b"), &head, &changes).unwrap());
        let assignee = "ab".repeat(32);
        let author = "cd".repeat(32);
        let trigger = "ef".repeat(32);
        assert_eq!(
            event.content,
            format!(
                r#"{{"title":"New title","description":"Old desc","assignees":[{{"type":"agent","id":"{assignee}","role":"lead"}}],"executionState":"running","linkedGitIssue":"buzz://issue?id=abc","createdBy":"{author}","feedForwardContext":{{"note":"from rule"}},"comments":[{{"id":"c1","authorId":"{author}","body":"hi","createdAt":"2026-08-13T00:00:00Z"}}],"parentGoalId":"goal-1","sourceLineage":{{"ruleId":"rule-1","triggerEventId":"{trigger}"}},"approvalDecision":{{"state":"approved"}}}}"#
            )
        );
        // Tags unchanged, including the re-emitted feed-rule lineage pair.
        assert_eq!(
            tag_slices(&event),
            owned(&[
                &["d", "card-1"],
                &["a", &format!("30623:{owner}:b")],
                &["l", "l-backlog"],
                &["t", "brand:clean"],
                &["t", "fn:build"],
                &["p", &assignee, "", "lead"],
                &["rank", "n"],
                &["feedRule", "rule-1", &trigger],
                &["e", &trigger],
            ])
        );
    }

    /// TS `buildCardEventTemplate` throws when lineage has only one of
    /// ruleId / triggerEventId; the CLI mirrors that instead of writing a
    /// half-lineage the Desktop parser would drop the card over.
    #[test]
    fn card_update_rejects_half_lineage() {
        let keys = Keys::generate();
        let mut head = CardSnapshot::from_event(&rich_card_event(&keys)).unwrap();
        head.source_lineage = Some(serde_json::json!({"ruleId": "rule-1"}));
        let owner = "cd".repeat(32);
        let changes = CardChanges::default();
        assert!(build_card_update_event(&format!("30623:{owner}:b"), &head, &changes).is_err());
    }

    /// A goal attach on the update path lands after `comments`, matching
    /// where `parseCard` re-inserts parentGoalId.
    #[test]
    fn card_update_attaches_goal() {
        let keys = Keys::generate();
        let mut head = CardSnapshot::from_event(&rich_card_event(&keys)).unwrap();
        head.parent_goal_id = None;
        head.source_lineage = None;
        head.approval_decision = None;
        head.linked_git_issue = None;
        head.feed_forward_context = None;
        let owner = "cd".repeat(32);
        let changes = CardChanges {
            parent_goal_id: Some("goal-9".into()),
            ..Default::default()
        };
        let event =
            sign(build_card_update_event(&format!("30623:{owner}:b"), &head, &changes).unwrap());
        assert!(event.content.ends_with(r#","parentGoalId":"goal-9"}"#));
        assert!(!tag_slices(&event).iter().any(|t| t[0] == "feedRule"));
    }

    #[test]
    fn card_changes_is_empty_only_when_all_none() {
        assert!(CardChanges::default().is_empty());
        assert!(!CardChanges {
            rank: Some("m".into()),
            ..Default::default()
        }
        .is_empty());
        // An explicitly emptied assignee list is a change, not a no-op.
        assert!(!CardChanges {
            assignees: Some(vec![]),
            ..Default::default()
        }
        .is_empty());
    }

    #[test]
    fn apply_assign_upserts_by_id() {
        let hex_a = "ab".repeat(32);
        let hex_b = "cd".repeat(32);
        let existing = vec![AssigneeEntry {
            kind: "agent".into(),
            id: hex_a.clone(),
            role: None,
        }];
        // Re-assigning the same id replaces the role in place.
        let updated = apply_assign(&existing, parse_assignee(&format!("{hex_a}:lead")).unwrap());
        assert_eq!(updated.len(), 1);
        assert_eq!(updated[0].role.as_deref(), Some("lead"));
        // A new id appends, preserving order.
        let updated = apply_assign(&updated, parse_assignee(&hex_b).unwrap());
        assert_eq!(updated.len(), 2);
        assert_eq!(updated[1].id, hex_b);
    }

    #[test]
    fn apply_unassign_removes_or_errors() {
        let hex_a = "ab".repeat(32);
        let existing = vec![AssigneeEntry {
            kind: "agent".into(),
            id: hex_a.clone(),
            role: Some("lead".into()),
        }];
        assert!(apply_unassign(&existing, &hex_a).unwrap().is_empty());
        // Unknown id is a hard error — a typo silently passing would leave
        // the caller believing a person came off the card.
        assert!(apply_unassign(&existing, &"ff".repeat(32)).is_err());
    }

    #[test]
    fn parse_assign_pair_requires_known_role_and_hex() {
        let hex = "ab".repeat(32);
        let entry = parse_assign_pair("reviewer", &hex).unwrap();
        assert_eq!(entry.role.as_deref(), Some("reviewer"));
        assert!(parse_assign_pair("boss", &hex).is_err());
        assert!(parse_assign_pair("lead", "not-hex").is_err());
    }

    #[test]
    fn compute_move_rank_positions() {
        let column = vec![snap("a", "n"), snap("b", "p")];
        let top = compute_move_rank(&column, &MovePosition::Top).unwrap();
        assert!(is_valid_rank(&top) && top.as_str() < "n");
        let bottom = compute_move_rank(&column, &MovePosition::Bottom).unwrap();
        assert!(is_valid_rank(&bottom) && bottom.as_str() > "p");
        let before_b = compute_move_rank(&column, &MovePosition::Before("b".into())).unwrap();
        assert!(is_valid_rank(&before_b) && before_b.as_str() > "n" && before_b.as_str() < "p");
        let after_a = compute_move_rank(&column, &MovePosition::After("a".into())).unwrap();
        assert!(is_valid_rank(&after_a) && after_a.as_str() > "n" && after_a.as_str() < "p");
        // Anchoring off a card that is not in the column is an error, not a
        // silent append.
        assert!(compute_move_rank(&column, &MovePosition::Before("zzz".into())).is_err());
        // Empty column: every absolute position degenerates to the first rank.
        let empty: Vec<CardSnapshot> = vec![];
        assert_eq!(
            compute_move_rank(&empty, &MovePosition::Top).unwrap(),
            compute_move_rank(&empty, &MovePosition::Bottom).unwrap()
        );
    }

    fn goal_event(keys: &Keys, framework: &str) -> Event {
        EventBuilder::new(
            Kind::Custom(KIND_BOARD_GOAL as u16),
            format!(
                r#"{{"brandScope":"clean","framework":"{framework}","status":"approved","proposedCards":[]}}"#
            ),
        )
        .tags(vec![Tag::parse(["d", "goal-1"]).unwrap()])
        .sign_with_keys(keys)
        .unwrap()
    }

    #[test]
    fn goal_snapshot_mirrors_parse_goal_strictness() {
        let keys = Keys::generate();
        let ok = GoalSnapshot::from_event(&goal_event(&keys, "OKR")).unwrap();
        assert_eq!(ok.id, "goal-1");
        assert_eq!(ok.brand_scope, "clean");
        assert!(GoalSnapshot::from_event(&goal_event(&keys, "BOGUS")).is_err());
    }

    fn smart_args() -> GoalCreateArgs {
        GoalCreateArgs {
            framework: "SMART".into(),
            specific: Some("Peter can create a goal from Desktop".into()),
            measurable: Some("One goal exists on the hvgapp board after refresh".into()),
            attainable: Some("publishGoal already writes kind 30625".into()),
            relevant: Some("Goal rollup is dead until goals exist".into()),
            time_bound: Some("2026-08-22".into()),
            objective: None,
            krs: vec![],
            purposeful: None,
            actionable: None,
            continuous: None,
            trackable: None,
        }
    }

    #[test]
    fn parse_kr_splits_three_parts_and_keeps_extra_delimiter() {
        let kr = parse_kr("  content model :: pages :: 1::plus ").unwrap();
        assert_eq!(kr.description, "content model");
        assert_eq!(kr.target_metric, "pages");
        assert_eq!(kr.target_value, "1::plus");
        assert!(parse_kr("only-two::parts").is_err());
        assert!(parse_kr("a:: ::c").is_err());
        assert!(parse_kr("").is_err());
    }

    #[test]
    fn assemble_goal_body_smart_requires_five_flags() {
        let mut args = smart_args();
        args.specific = None;
        let err = assemble_goal_body(&args).unwrap_err();
        assert!(matches!(err, CliError::Usage(msg) if msg.contains("--specific")));
    }

    #[test]
    fn assemble_goal_body_smart_rejects_okr_flags() {
        let mut args = smart_args();
        args.objective = Some("nope".into());
        let err = assemble_goal_body(&args).unwrap_err();
        assert!(matches!(err, CliError::Usage(msg) if msg.contains("--objective")));
    }

    #[test]
    fn assemble_goal_body_okr_requires_kr_and_objective() {
        let args = GoalCreateArgs {
            framework: "OKR".into(),
            specific: None,
            measurable: None,
            attainable: None,
            relevant: None,
            time_bound: None,
            objective: Some("First reviews ship".into()),
            krs: vec![],
            purposeful: None,
            actionable: None,
            continuous: None,
            trackable: None,
        };
        let err = assemble_goal_body(&args).unwrap_err();
        assert!(matches!(err, CliError::Usage(msg) if msg.contains("--kr")));
        let mut with_kr = args.clone();
        with_kr.krs = vec!["content model::pages::1".into()];
        with_kr.objective = None;
        let err = assemble_goal_body(&with_kr).unwrap_err();
        assert!(matches!(err, CliError::Usage(msg) if msg.contains("--objective")));
    }

    #[test]
    fn assemble_goal_body_rejects_unknown_framework() {
        let mut args = smart_args();
        args.framework = "WOOP".into();
        assert!(assemble_goal_body(&args).is_err());
        args.framework = "smart".into();
        assert!(assemble_goal_body(&args).is_err());
    }

    #[test]
    fn build_goal_event_smart_matches_ts_template() {
        let body = assemble_goal_body(&smart_args()).unwrap();
        let event = sign(build_goal_event("hvgapp-ship", "hvgapp", &body).unwrap());
        assert_eq!(event.kind, kind_board_goal());
        assert_eq!(tag_slices(&event), owned(&[&["d", "hvgapp-ship"]]));
        // Byte-exact: TS key order is brandScope, framework, smart?, okr?,
        // pact?, status, proposedCards. Absent framework blocks omitted.
        assert_eq!(
            event.content,
            r#"{"brandScope":"hvgapp","framework":"SMART","smart":{"specific":"Peter can create a goal from Desktop","measurable":"One goal exists on the hvgapp board after refresh","attainable":"publishGoal already writes kind 30625","relevant":"Goal rollup is dead until goals exist","timeBound":"2026-08-22"},"status":"draft","proposedCards":[]}"#
        );
        let snap = GoalSnapshot::from_event(&event).unwrap();
        assert_eq!(snap.id, "hvgapp-ship");
        assert_eq!(snap.brand_scope, "hvgapp");
    }

    #[test]
    fn build_goal_event_okr_matches_ts_template() {
        let args = GoalCreateArgs {
            framework: "OKR".into(),
            specific: None,
            measurable: None,
            attainable: None,
            relevant: None,
            time_bound: None,
            objective: Some("Run Clean capture end to end".into()),
            krs: vec!["One home captured::homes captured::1".into()],
            purposeful: None,
            actionable: None,
            continuous: None,
            trackable: None,
        };
        let body = assemble_goal_body(&args).unwrap();
        let event = sign(build_goal_event("clean-launch", "clean", &body).unwrap());
        assert_eq!(tag_slices(&event), owned(&[&["d", "clean-launch"]]));
        assert_eq!(
            event.content,
            r#"{"brandScope":"clean","framework":"OKR","okr":{"objective":"Run Clean capture end to end","keyResults":[{"description":"One home captured","targetMetric":"homes captured","targetValue":"1"}]},"status":"draft","proposedCards":[]}"#
        );
        assert!(!event.content.contains("currentValue"));
    }

    #[test]
    fn build_goal_event_pact_matches_ts_template() {
        let args = GoalCreateArgs {
            framework: "PACT".into(),
            specific: None,
            measurable: None,
            attainable: None,
            relevant: None,
            time_bound: None,
            objective: None,
            krs: vec![],
            purposeful: Some("Daily proof stays in the user's hands".into()),
            actionable: Some("Ship the check-in surface".into()),
            continuous: Some("One check-in per day".into()),
            trackable: Some("Streak length".into()),
        };
        let body = assemble_goal_body(&args).unwrap();
        let event = sign(build_goal_event("lhfyc-habits", "lhfyc", &body).unwrap());
        assert_eq!(
            event.content,
            r#"{"brandScope":"lhfyc","framework":"PACT","pact":{"purposeful":"Daily proof stays in the user's hands","actionable":"Ship the check-in surface","continuous":"One check-in per day","trackable":"Streak length"},"status":"draft","proposedCards":[]}"#
        );
        let snap = GoalSnapshot::from_event(&event).unwrap();
        assert_eq!(snap.id, "lhfyc-habits");
        assert_eq!(snap.brand_scope, "lhfyc");
    }

    #[test]
    fn build_goal_event_rejects_empty_id() {
        let body = assemble_goal_body(&smart_args()).unwrap();
        assert!(build_goal_event("", "hvgapp", &body).is_err());
        assert!(build_goal_event("hvgapp-ship", "", &body).is_err());
    }
}
