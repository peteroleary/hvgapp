/**
 * Fractional ranking for Board cards and lists.
 *
 * Every drag needs a new rank that sorts strictly between the two cards it was
 * dropped between, without renumbering the neighbours. Renumbering would mean
 * republishing every card in the column on every drag; a fractional index
 * republishes exactly one event, which is what makes drag-and-drop cheap over
 * a relay.
 *
 * Ranks are lowercase `a`-`z` strings compared lexicographically, matching the
 * `rank.localeCompare(rank)` ordering that `boardEvents` already applies when
 * it builds a column. Think of a rank as the fraction it spells in base 26:
 * `"n"` is the middle of the alphabet, `"hn"` sits between `"h"` and `"i"`.
 * Strings grow only when a gap runs out of whole digits, so ordinary use keeps
 * them short.
 *
 * Data-contract section 4: lexicographic insert-between, deterministic
 * tiebreak on `(rank, createdAt, id)`.
 */

const DIGITS = "abcdefghijklmnopqrstuvwxyz";
const BASE = DIGITS.length;
const LOWEST = DIGITS[0];
const RANK_PATTERN = /^[a-z]+$/;

/** The rank handed to the first card in an empty column. */
export const RANK_FIRST = "n";

/**
 * Publish-time guard: true when `rankBetween` can compute with the value.
 * Anything a Board event carries must pass this, or every later drag against
 * that entry throws the moment the primitive tries to subdivide around it.
 */
export function isValidRank(rank: string): boolean {
  return RANK_PATTERN.test(rank);
}

/**
 * A rank must never end in `a`. `a` is the lowest digit, so a trailing `a`
 * leaves no room to insert below it without lengthening the *neighbour* — the
 * one thing fractional ranking exists to avoid. Refusing to emit one keeps
 * every gap subdividable forever.
 */
function assertRank(rank: string, label: string): void {
  if (!RANK_PATTERN.test(rank)) {
    throw new Error(
      `Board ${label} rank must use the a-z alphabet, received "${rank}".`,
    );
  }
  if (rank.endsWith(LOWEST)) {
    throw new Error(
      `Board ${label} rank must not end in "${LOWEST}", received "${rank}".`,
    );
  }
}

/**
 * Returns a string strictly between `lower` and `upper`.
 *
 * `lower` is `""` to mean "the very start" and `upper` is `null` to mean "the
 * very end". Both bounds are assumed already validated.
 */
function midpoint(lower: string, upper: string | null): string {
  if (upper !== null) {
    // Copy any shared prefix through untouched and subdivide the first gap
    // where the two bounds actually diverge.
    let shared = 0;
    while ((lower[shared] ?? LOWEST) === upper[shared]) {
      shared += 1;
    }
    if (shared > 0) {
      return (
        upper.slice(0, shared) +
        midpoint(lower.slice(shared), upper.slice(shared))
      );
    }
  }

  const lowerDigit = lower ? DIGITS.indexOf(lower[0]) : 0;
  const upperDigit = upper !== null ? DIGITS.indexOf(upper[0]) : BASE;

  if (upperDigit - lowerDigit > 1) {
    // A whole digit fits in the gap, so the rank stays the same length.
    return DIGITS[Math.round((lowerDigit + upperDigit) / 2)];
  }

  // The digits are adjacent, so descend a place and split there instead.
  if (upper !== null && upper.length > 1) {
    return upper.slice(0, 1);
  }
  return DIGITS[lowerDigit] + midpoint(lower.slice(1), null);
}

/**
 * Returns a rank that sorts strictly between `before` and `after`.
 *
 * Pass `null` for either side to append to the start or end of a column:
 * `rankBetween(null, first)` prepends, `rankBetween(last, null)` appends, and
 * `rankBetween(null, null)` seeds an empty column.
 *
 * @throws if `before` does not already sort before `after`, which means the
 * caller computed its drop neighbours the wrong way round.
 */
export function rankBetween(
  before: string | null,
  after: string | null,
): string {
  if (before !== null) {
    assertRank(before, "predecessor");
  }
  if (after !== null) {
    assertRank(after, "successor");
  }
  if (before !== null && after !== null && before >= after) {
    throw new Error(
      `Board rank "${before}" must sort before "${after}" to insert between them.`,
    );
  }
  if (before === null && after === null) {
    return RANK_FIRST;
  }
  return midpoint(before ?? "", after);
}

/** The fields ordering depends on; `Card` and `BoardList` both satisfy it. */
export interface RankedEntry {
  rank: string;
  createdAt?: number;
  id?: string;
}

/**
 * Orders two ranked entries, falling back to `createdAt` then `id`.
 *
 * Two clients can drag into the same gap simultaneously and both writes
 * survive as separate addressable events, so equal ranks are expected rather
 * than exceptional. Without a tiebreak those two cards would swap places
 * depending on relay arrival order; with one, every client renders the same
 * column.
 */
export function compareRank(left: RankedEntry, right: RankedEntry): number {
  const byRank = left.rank.localeCompare(right.rank);
  if (byRank !== 0) {
    return byRank;
  }
  const byCreatedAt = (left.createdAt ?? 0) - (right.createdAt ?? 0);
  if (byCreatedAt !== 0) {
    return byCreatedAt;
  }
  return (left.id ?? "").localeCompare(right.id ?? "");
}
