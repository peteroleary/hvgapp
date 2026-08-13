//! Fractional ranking for Board cards and lists — a verbatim port of
//! `desktop/src/features/board/state/rank.ts`. The two implementations must
//! not disagree: Desktop renders columns by lexicographic rank order, so a
//! CLI-generated rank the TS side would compute differently would silently
//! reorder or corrupt columns. Mirrored test vectors below are the drift
//! guard until the conformance fixture carries rank vectors (spec task 3,
//! PLANS/BUZZ_BOARD_CLI.md).
//!
//! Ranks are lowercase `a`-`z` strings compared lexicographically — think of
//! a rank as the fraction it spells in base 26: `"n"` is the middle of the
//! alphabet, `"hn"` sits between `"h"` and `"i"`. Strings grow only when a
//! gap runs out of whole digits, so ordinary use keeps them short.
//!
//! Callers never pass raw ranks in from the CLI surface; ranks are an
//! implementation detail generated here.

use crate::error::CliError;

const DIGITS: &[u8; 26] = b"abcdefghijklmnopqrstuvwxyz";
const BASE: usize = 26;
const LOWEST: u8 = b'a';

/// The rank handed to the first entry in an empty column.
pub const RANK_FIRST: &str = "n";

/// Publish-time guard: true when `rank_between` can compute with the value.
/// Enforces both of `assert_rank`'s rules — the a-z alphabet and no trailing
/// `a` — and the mirrored tests assert the two never drift apart.
pub fn is_valid_rank(rank: &str) -> bool {
    !rank.is_empty()
        && rank.bytes().all(|b| b.is_ascii_lowercase())
        && !rank.ends_with(LOWEST as char)
}

/// A rank must never end in `a`. `a` is the lowest digit, so a trailing `a`
/// leaves no room to insert below it without lengthening the *neighbour* —
/// the one thing fractional ranking exists to avoid.
fn assert_rank(rank: &str, label: &str) -> Result<(), CliError> {
    if rank.is_empty() || !rank.bytes().all(|b| b.is_ascii_lowercase()) {
        return Err(CliError::Usage(format!(
            "board {label} rank must use the a-z alphabet, received {rank:?}"
        )));
    }
    if rank.ends_with(LOWEST as char) {
        return Err(CliError::Usage(format!(
            "board {label} rank must not end in {:?}, received {rank:?}",
            LOWEST as char
        )));
    }
    Ok(())
}

/// Returns a string strictly between `lower` and `upper`.
///
/// `lower` is `""` to mean "the very start" and `upper` is `None` to mean
/// "the very end". Both bounds are assumed already validated.
fn midpoint(lower: &str, upper: Option<&str>) -> String {
    if let Some(upper) = upper {
        // Copy any shared prefix through untouched and subdivide the first
        // gap where the two bounds actually diverge.
        let lb = lower.as_bytes();
        let ub = upper.as_bytes();
        let mut shared = 0;
        loop {
            let l = lb.get(shared).copied().unwrap_or(LOWEST);
            match ub.get(shared) {
                Some(&u) if u == l => shared += 1,
                _ => break,
            }
        }
        if shared > 0 {
            // `shared` can run past `lower`'s length: an exhausted `lower`
            // reads as LOWEST, matching JS `lower[shared] ?? LOWEST`, so a
            // leading-"a" upper keeps consuming. JS `slice` clamps; index
            // with `get` to mirror that instead of panicking.
            return format!(
                "{}{}",
                &upper[..shared],
                midpoint(lower.get(shared..).unwrap_or(""), Some(&upper[shared..]))
            );
        }
    }

    let lower_digit = lower
        .bytes()
        .next()
        .map(|b| usize::from(b - LOWEST))
        .unwrap_or(0);
    let upper_digit = upper
        .and_then(|u| u.bytes().next())
        .map(|b| usize::from(b - LOWEST))
        .unwrap_or(BASE);

    if upper_digit - lower_digit > 1 {
        // A whole digit fits in the gap, so the rank stays the same length.
        // f64::round matches JS Math.round for these (positive) values.
        let mid = ((lower_digit + upper_digit) as f64 / 2.0).round() as usize;
        return (DIGITS[mid] as char).to_string();
    }

    // The digits are adjacent, so descend a place and split there instead.
    if let Some(upper) = upper {
        if upper.len() > 1 {
            return upper[..1].to_string();
        }
    }
    format!(
        "{}{}",
        DIGITS[lower_digit] as char,
        midpoint(lower.get(1..).unwrap_or(""), None)
    )
}

/// Returns a rank that sorts strictly between `before` and `after`.
///
/// Pass `None` for either side to append to the start or end of a column:
/// `rank_between(None, first)` prepends, `rank_between(last, None)` appends,
/// and `rank_between(None, None)` seeds an empty column.
///
/// Errors if `before` does not already sort before `after`.
pub fn rank_between(before: Option<&str>, after: Option<&str>) -> Result<String, CliError> {
    if let Some(b) = before {
        assert_rank(b, "predecessor")?;
    }
    if let Some(a) = after {
        assert_rank(a, "successor")?;
    }
    if let (Some(b), Some(a)) = (before, after) {
        if b >= a {
            return Err(CliError::Usage(format!(
                "board rank {b:?} must sort before {a:?} to insert between them"
            )));
        }
    }
    if before.is_none() && after.is_none() {
        return Ok(RANK_FIRST.to_string());
    }
    Ok(midpoint(before.unwrap_or(""), after))
}

/// Orders two ranked entries, falling back to `created_at` then `id` —
/// the port of `compareRank`. Two clients can drag into the same gap
/// simultaneously and both writes survive, so equal ranks are expected; the
/// tiebreak keeps every client rendering the same column.
pub fn compare_rank(
    left: (&str, u64, &str),
    right: (&str, u64, &str),
) -> std::cmp::Ordering {
    left.0
        .cmp(right.0)
        .then(left.1.cmp(&right.1))
        .then(left.2.cmp(right.2))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sorted(mut ranks: Vec<String>) -> Vec<String> {
        ranks.sort();
        ranks
    }

    #[test]
    fn no_neighbours_returns_seed_rank() {
        assert_eq!(rank_between(None, None).unwrap(), RANK_FIRST);
    }

    #[test]
    fn rank_sorts_before_known_successor() {
        let rank = rank_between(None, Some("n")).unwrap();
        assert!(rank.as_str() < "n", "{rank} should sort before n");
    }

    #[test]
    fn rank_sorts_after_known_predecessor() {
        let rank = rank_between(Some("n"), None).unwrap();
        assert!(rank.as_str() > "n", "{rank} should sort after n");
    }

    #[test]
    fn rank_lands_strictly_between_neighbours() {
        let rank = rank_between(Some("h"), Some("n")).unwrap();
        assert!(rank.as_str() > "h" && rank.as_str() < "n");
    }

    #[test]
    fn adjacent_single_chars_grow_length() {
        let rank = rank_between(Some("h"), Some("i")).unwrap();
        assert!(rank.as_str() > "h" && rank.as_str() < "i");
        assert!(rank.len() > 1, "adjacent digits must extend the string");
    }

    #[test]
    fn rejects_reversed_or_equal_pair() {
        assert!(rank_between(Some("n"), Some("h")).is_err());
        assert!(rank_between(Some("n"), Some("n")).is_err());
    }

    #[test]
    fn rejects_ranks_outside_alphabet() {
        for bad in ["A", "h1", ""] {
            assert!(rank_between(Some(bad), None).is_err(), "{bad:?} rejected");
        }
    }

    #[test]
    fn generated_ranks_never_end_in_lowest_digit() {
        let mut lower = RANK_FIRST.to_string();
        for _ in 0..200 {
            let next = rank_between(None, Some(&lower)).unwrap();
            assert!(!next.ends_with('a'), "{next} must not end in 'a'");
            assert!(next < lower);
            lower = next;
        }
    }

    #[test]
    fn repeated_inserts_in_same_gap_stay_ordered() {
        let mut low = "h".to_string();
        let high = "i";
        for _ in 0..200 {
            let mid = rank_between(Some(&low), Some(high)).unwrap();
            assert!(mid > low, "{mid} should sort after {low}");
            assert!(mid.as_str() < high, "{mid} should sort before {high}");
            low = mid;
        }
    }

    #[test]
    fn appending_stays_ordered_and_unique() {
        let mut ranks: Vec<String> = Vec::new();
        let mut last: Option<String> = None;
        for _ in 0..300 {
            last = Some(rank_between(last.as_deref(), None).unwrap());
            ranks.push(last.clone().unwrap());
        }
        assert_eq!(ranks, sorted(ranks.clone()));
        let unique: std::collections::HashSet<&String> = ranks.iter().collect();
        assert_eq!(unique.len(), ranks.len());
    }

    /// The seeded-PRNG scatter test from `rank.test.mjs`, with the same
    /// LCG constants — deterministic and reproducible across languages.
    /// (JS does the multiply-add in f64 then truncates via `& 0x7fffffff`;
    /// i64 reproduces it exactly at these magnitudes.)
    #[test]
    fn random_insertions_preserve_sort_order() {
        let mut seed: i64 = 0x5eed;
        let mut rand = move || {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            seed as f64 / 0x7fffffff as f64
        };

        let mut column = vec![rank_between(None, None).unwrap()];
        for _ in 0..500 {
            let at = (rand() * (column.len() + 1) as f64).floor() as usize;
            let before = if at == 0 { None } else { Some(column[at - 1].as_str()) };
            let after = column.get(at).map(String::as_str);
            let rank = rank_between(before, after).unwrap();
            column.insert(at, rank);
        }

        assert_eq!(column, sorted(column.clone()), "column drifted out of order");
        let unique: std::collections::HashSet<&String> = column.iter().collect();
        assert_eq!(unique.len(), column.len(), "ranks must stay unique");
    }

    #[test]
    fn compare_rank_breaks_ties_by_created_at_then_id() {
        let a = ("n", 10, "b");
        let b = ("n", 10, "a");
        let c = ("n", 5, "z");
        let d = ("h", 99, "z");
        assert_eq!(compare_rank(d, a), std::cmp::Ordering::Less);
        assert_eq!(compare_rank(c, a), std::cmp::Ordering::Less);
        assert_eq!(compare_rank(b, a), std::cmp::Ordering::Less);
        assert_eq!(compare_rank(a, a), std::cmp::Ordering::Equal);
    }

    #[test]
    fn compare_rank_orders_like_plain_sort() {
        let entries: Vec<(&str, u64, String)> = ["n", "h", "u", "hn", "an", "z"]
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, i as u64, format!("id{i}")))
            .collect();
        let mut via_compare = entries.clone();
        via_compare.sort_by(|l, r| compare_rank((l.0, l.1, &l.2), (r.0, r.1, &r.2)));
        let via_compare: Vec<&str> = via_compare.iter().map(|e| e.0).collect();
        let plain = sorted(entries.iter().map(|e| e.0.to_string()).collect());
        assert_eq!(via_compare, plain);
    }

    /// `is_valid_rank` and `rank_between` encode the same rule; this fails
    /// the moment either changes without the other. Mirrors the TS test
    /// candidate-for-candidate.
    #[test]
    fn is_valid_rank_agrees_with_rank_between() {
        for candidate in ["a", "na", "ba", "n", "u", "z", "hn", "A", "h1", ""] {
            assert_eq!(
                is_valid_rank(candidate),
                rank_between(Some(candidate), None).is_ok(),
                "guard/rank_between disagree on {candidate:?}"
            );
        }
        assert!(is_valid_rank("n"));
        assert!(!is_valid_rank("a"));
        assert!(!is_valid_rank("na"));
        assert!(is_valid_rank("an"));
    }

    /// Exact-value pins against the TS implementation: the default five-list
    /// chain (`buildDefaultLists` in `BoardScreen.tsx`) must produce these
    /// exact ranks, byte for byte. Verified against `rank.ts` on node.
    #[test]
    fn default_list_rank_chain_matches_ts() {
        let mut ranks = Vec::new();
        let mut last: Option<String> = None;
        for _ in 0..5 {
            last = Some(rank_between(last.as_deref(), None).unwrap());
            ranks.push(last.clone().unwrap());
        }
        assert_eq!(ranks, vec!["n", "u", "x", "z", "zn"]);
    }

    /// Exact-value pins for the two prepend paths where empty-slice
    /// semantics differ between JS (`slice` clamps) and Rust (indexing
    /// panics): TS `rankBetween(null, "b")` is `"an"` and
    /// `rankBetween(null, "an")` is `"ah"`.
    #[test]
    fn prepend_edge_cases_match_ts() {
        assert_eq!(rank_between(None, Some("b")).unwrap(), "an");
        assert_eq!(rank_between(None, Some("an")).unwrap(), "ah");
    }
}
