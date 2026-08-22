import {
  resolveUserLabel,
  type UserProfileLookup,
} from "@/features/profile/lib/identity";
import { normalizePubkey } from "@/shared/lib/pubkey";

import type { Assignee, Card } from "../types/boardTypes";

/**
 * Every distinct assignee pubkey on a board, normalized and sorted.
 *
 * A board is dozens of cards over a handful of keys, so the caller resolves
 * this set once and hands the result down, rather than each card resolving
 * its own assignees.
 */
export function collectAssigneePubkeys(cards: readonly Card[]): string[] {
  const pubkeys = new Set<string>();
  for (const card of cards) {
    for (const assignee of card.assignees) {
      const pubkey = normalizePubkey(assignee.id);
      if (pubkey) pubkeys.add(pubkey);
    }
  }
  return [...pubkeys].sort();
}

/**
 * The label to show for one assignee: their profile display name, falling back
 * to an 8-character pubkey prefix.
 *
 * Delegates to `resolveUserLabel`, the same resolver every other surface uses
 * (`display_name` -> `name` -> `truncatePubkey`), so the board cannot drift
 * into naming people differently from the rest of the app. Unlike message
 * authorship, a board assignment reads as a name in a roster rather than as
 * something the current user said, so `preferResolvedSelfLabel` keeps the
 * viewer's own key rendering as their handle instead of "You".
 */
export function assigneeDisplayName(
  assignee: Assignee,
  profiles?: UserProfileLookup,
): string {
  return resolveUserLabel({
    preferResolvedSelfLabel: true,
    profiles,
    pubkey: assignee.id,
  });
}

/**
 * Up to two initials for the avatar chip, derived from the resolved name so
 * agent handles read as `TU`/`MF` rather than the first two hex characters of
 * a pubkey. Falls back to the first two characters when a name has no letters
 * or digits to take initials from.
 */
export function assigneeInitials(displayName: string): string {
  const words = displayName.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}
