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
//!   --fn <area> [--list <id|title>] [--assignee <hex>[:role]]...`
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

use buzz_core::kind::{KIND_BOARD, KIND_BOARD_CARD};

/// The standard column set — one shape, everywhere (Fizz+Prop, #build
/// 2026-08-12). Source of truth: Desktop's exported default-list module
/// (`ui/boardListDefaults.ts`; see spec "The standard column set").
///
/// Titles compare byte-exact (`--list` title lookup and Desktop rendering
/// both): straight ASCII apostrophe in `Spec'd`, no curly quotes, no
/// trailing spaces. Lists are immutable from the CLI in v1, so whatever
/// shape a board is born with is the shape it keeps.
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

/// The Board function taxonomy (`FunctionArea` in `types/boardTypes.ts`).
/// Mirrors `FUNCTION_AREAS` in `boardEvents.ts`.
pub const FUNCTION_AREAS: [&str; 8] = [
    "build", "design", "content", "social", "marketing", "sales", "research", "other",
];

/// Card execution states (`CardExecutionState` in `types/boardTypes.ts`).
/// `card add` always writes `idle`; the set is mirrored for validation on
/// read and for the later `card set` verb.
#[allow(dead_code)] // wired into `card set` later
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

fn kind_board() -> Kind {
    Kind::Custom(KIND_BOARD as u16)
}

fn kind_board_card() -> Kind {
    Kind::Custom(KIND_BOARD_CARD as u16)
}

fn parse_events(json: &str) -> Result<Vec<Event>, CliError> {
    serde_json::from_str::<Vec<Event>>(json)
        .map_err(|e| CliError::Other(format!("failed to parse relay response: {e}")))
}

/// The single `d` tag of an event, mirroring `uniqueDTag` in
/// `boardEvents.ts`: exactly one `d` tag with a non-empty value, else None.
fn unique_d_tag(event: &Event) -> Option<&str> {
    let mut d_tags = event.tags.iter().filter(|t| {
        t.as_slice().first().map(String::as_str) == Some("d")
    });
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
                return Err(CliError::Other("board list entry has an empty field".into()));
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

/// Content of a kind:30624 event as `card add` writes it. Field order
/// matches the TS `Card` interface minus the indexed fields; the optionals
/// `card add` never sets (`linkedGitIssue`, `feedForwardContext`, …) sit
/// between these fields in TS but are omitted by `JSON.stringify` when
/// undefined, so their absence here is byte-identical.
#[derive(serde::Serialize)]
struct CardContent<'a> {
    title: &'a str,
    description: &'a str,
    assignees: &'a [AssigneeEntry],
    #[serde(rename = "executionState")]
    execution_state: &'a str,
    #[serde(rename = "createdBy")]
    created_by: &'a str,
    comments: &'a [serde_json::Value],
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
    let content = serde_json::to_string(&CardContent {
        title,
        description,
        assignees,
        execution_state,
        created_by,
        comments: &[],
    })
    .map_err(|e| CliError::Other(format!("failed to serialize card: {e}")))?;
    Ok(EventBuilder::new(kind_board_card(), content).tags(tags))
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
    let titles: Vec<String> = csv
        .split(',')
        .map(str::trim)
        .map(str::to_owned)
        .collect();
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
    validate_hex64(id).map_err(|_| {
        CliError::Usage(format!(
            "assignee id {id:?} is not a 64-hex pubkey"
        ))
    })?;
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

pub async fn cmd_get(client: &BuzzClient, board_id: &str) -> Result<(), CliError> {
    let board = fetch_board_head(client, board_id)
        .await?
        .ok_or_else(|| CliError::NotFound(format!("board not found: {board_id}")))?;
    let cards = fetch_board_cards(client, &board.id).await?;

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
                        "assignees": c.assignees,
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
        .last();
    let rank = rank_between(last_rank, None)?;

    let card_id = uuid::Uuid::new_v4().to_string();
    let board_address = board.coordinate();
    let me = client.keys().public_key().to_hex();
    let builder = build_card_event(
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
    )?;
    let event = sign_and_submit(client, builder, "relay reported card event as duplicate").await?;
    println!("event_id   {}", event.id.to_hex());
    println!("coordinate {KIND_BOARD_CARD}:{}:{card_id}", event.pubkey.to_hex());
    println!("board      {board_address}");
    println!("list       {} ({})", list.title, list.id);
    println!("rank       {rank}");
    Ok(())
}

pub async fn dispatch(cmd: crate::BoardCmd, client: &BuzzClient) -> Result<(), CliError> {
    use crate::{BoardCardCmd, BoardCmd};
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
            )
            .await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr::{Keys, Timestamp};

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
        event
            .tags
            .iter()
            .map(|t| t.as_slice().to_vec())
            .collect()
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
            build_board_event("kb-board", "K&B Concrete", None, Some("concrete"), &lists)
                .unwrap(),
        );
        assert_eq!(event.kind, kind_board());
        assert_eq!(
            tag_slices(&event),
            owned(&[&["d", "kb-board"], &["t", "brand:concrete"]])
        );
        // Byte-exact: TS key order is title, description?, brandScope?, lists.
        assert_eq!(
            event.content,
            r#"{"title":"K&B Concrete","brandScope":"concrete","lists":[{"id":"list-1","title":"Backlog","rank":"n"}]}"#
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
        assert!(tag_slices(&event)
            .iter()
            .any(|t| t == &vec!["p".to_string(), "ab".repeat(32), String::new(), String::new()]));
        // role key omitted from content when unset (TS: `role?` undefined).
        assert!(event.content.contains(r#""assignees":[{"type":"agent","id":"#));
        assert!(!event.content.contains("role"));
    }

    #[test]
    fn build_card_event_rejects_contract_violations() {
        let owner = "cd".repeat(32);
        let addr = format!("30623:{owner}:b");
        let base = |rank: &str| {
            build_card_event(&addr, "c", "t", "d", "clean", "build", &[], "idle", rank, "l", &owner)
        };
        assert!(base("na").is_err()); // invalid rank
        assert!(base("").is_err());
        assert!(build_card_event("30624:x:y", "c", "t", "d", "clean", "build", &[], "idle", "n", "l", &owner).is_err());
        assert!(build_card_event(&addr, "", "t", "d", "clean", "build", &[], "idle", "n", "l", &owner).is_err());
        assert!(build_card_event(&addr, "c", "t", "d", "clean", "nope", &[], "idle", "n", "l", &owner).is_err());
        assert!(build_card_event(&addr, "c", "t", "d", "clean", "build", &[], "done", "n", "l", &owner).is_err());
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
}
